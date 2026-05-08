import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { VAT_RATE } from '@/lib/constants';

function periodStart(period: string): Date | undefined {
  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null;
  if (days === null) return undefined;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const startDate = periodStart(period);
    const where = startDate ? { createdAt: { gte: startDate } } : {};

    const [
      orders,
      paidOrders,
      refundedOrdersAgg,
      pendingPayouts,
      paidPayouts,
      topSellersData,
    ] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          totalAmount: true,
          shippingFee: true,
          platformFee: true,
          paymentStatus: true,
          createdAt: true,
          items: { select: { priceAtPurchase: true, quantity: true, status: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { totalAmount: true, platformFee: true, shippingFee: true },
        _count: { _all: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          status: 'REFUNDED',
          ...(startDate ? { order: { createdAt: { gte: startDate } } } : {}),
        },
        _sum: { priceAtPurchase: true },
        _count: { _all: true },
      }),
      prisma.payout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: { status: 'PAID', ...(startDate ? { processedAt: { gte: startDate } } : {}) },
        _sum: { amount: true },
      }),
      prisma.orderItem.groupBy({
        by: ['sellerNameSnapshot'],
        where: startDate ? { order: { createdAt: { gte: startDate } } } : {},
        _sum: { priceAtPurchase: true, quantity: true },
        _count: { orderId: true },
        orderBy: { _sum: { priceAtPurchase: 'desc' } },
        take: 10,
      }),
    ]);

    // Daily series (gross, order count)
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().split('T')[0];
      const entry = dailyMap.get(key) || { revenue: 0, orders: 0 };
      entry.revenue += o.totalAmount;
      entry.orders += 1;
      dailyMap.set(key, entry);
    }
    const dailySeries = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const gmv = paidOrders._sum.totalAmount || 0;
    const platformFees = paidOrders._sum.platformFee || 0;
    const shippingFees = paidOrders._sum.shippingFee || 0;
    const vatCollected = (gmv - shippingFees) * VAT_RATE;
    const netRevenue = platformFees + vatCollected;
    const refundsIssued = (refundedOrdersAgg._sum.priceAtPurchase || 0) * (refundedOrdersAgg._count._all || 0);
    const orderCount = paidOrders._count._all || 0;
    const avgOrderValue = orderCount > 0 ? gmv / orderCount : 0;

    // Resolve sellerId + revenue
    const sellerNames = topSellersData.map((s) => s.sellerNameSnapshot);
    const sellerProfiles = sellerNames.length
      ? await prisma.sellerProfile.findMany({
          where: { storeName: { in: sellerNames } },
          select: { id: true, storeName: true },
        })
      : [];
    const topSellers = topSellersData.map((s) => {
      const p = sellerProfiles.find((sp) => sp.storeName === s.sellerNameSnapshot);
      return {
        id: p?.id || s.sellerNameSnapshot,
        storeName: s.sellerNameSnapshot,
        revenue: s._sum.priceAtPurchase || 0,
        orders: s._count.orderId,
      };
    });

    return NextResponse.json({
      period,
      gmv,
      netRevenue,
      platformFees,
      vatCollected,
      shippingFees,
      pendingPayouts: pendingPayouts._sum.amount || 0,
      paidPayouts: paidPayouts._sum.amount || 0,
      refundsIssued,
      orderCount,
      avgOrderValue,
      topSellers,
      dailySeries,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[admin/financial]', err);
    return NextResponse.json({ message: err.message || 'Failed to load financial data' }, { status: 500 });
  }
}
