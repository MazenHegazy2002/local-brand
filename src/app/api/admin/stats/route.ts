import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

const DAY = 86_400_000;
const LOST = ['CANCELLED', 'RETURNED'] as const;

// Admin overview for the mobile app. `range` = today | 7d | 30d; every number is
// compared with the previous period of the same length.
export async function GET(req: NextRequest) {
  if ((await getRequestUser(req))?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const range = new URL(req.url).searchParams.get('range') ?? 'today';
  const days = range === '30d' ? 30 : range === '7d' ? 7 : 1;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() - (days - 1) * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);

  const summary = async (from: Date, to?: Date) => {
    const createdAt = { gte: from, ...(to ? { lt: to } : {}) };
    const [sales, paid, orders, lost, newUsers] = await Promise.all([
      // COD orders stay UNPAID until delivery, so "sales" counts every order that wasn't lost.
      prisma.order.aggregate({
        where: { createdAt, status: { notIn: [...LOST] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { createdAt, paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { createdAt } }),
      prisma.order.count({ where: { createdAt, status: { in: [...LOST] } } }),
      prisma.user.count({ where: { createdAt } }),
    ]);
    return {
      sales: Number(sales._sum.totalAmount ?? 0),
      collected: Number(paid._sum.totalAmount ?? 0),
      orders,
      newUsers,
      cancelRate: orders ? lost / orders : 0,
    };
  };

  const [current, previous, periodOrders, statusGroups, paymentGroups, items, recent, totals] =
    await Promise.all([
      summary(start),
      summary(prevStart, start),
      prisma.order.findMany({
        where: { createdAt: { gte: start }, status: { notIn: [...LOST] } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: start } }, _count: true }),
      prisma.order.groupBy({
        by: ['paymentMethod'],
        where: { createdAt: { gte: start } },
        _count: true,
      }),
      // ponytail: aggregates in JS; move to SQL if a period ever holds >~50k items.
      prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: start }, status: { notIn: [...LOST] } } },
        select: { sellerNameSnapshot: true, priceAtPurchase: true, quantity: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
          guestEmail: true,
          user: { select: { name: true } },
        },
      }),
      Promise.all([
        prisma.user.count(),
        prisma.sellerProfile.count({ where: { status: 'ACTIVE' } }),
        prisma.sellerProfile.count({ where: { status: 'PENDING_APPROVAL' } }),
        prisma.product.count({ where: { published: true } }),
        prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING'] } } }),
        prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
        prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
        prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      ]),
    ]);

  // Hourly buckets for today, daily buckets otherwise.
  const step = days === 1 ? 3_600_000 : DAY;
  const series = Array.from({ length: days === 1 ? 24 : days }, (_, i) => {
    const at = new Date(start.getTime() + i * step);
    return {
      label: days === 1 ? String(at.getHours()) : `${at.getDate()}/${at.getMonth() + 1}`,
      value: 0,
    };
  });
  for (const o of periodOrders) {
    const bucket = series[Math.floor((o.createdAt.getTime() - start.getTime()) / step)];
    if (bucket) bucket.value += o.totalAmount;
  }

  const bySeller = new Map<string, { revenue: number; units: number }>();
  for (const it of items) {
    const s = bySeller.get(it.sellerNameSnapshot) ?? { revenue: 0, units: 0 };
    s.revenue += it.priceAtPurchase * it.quantity;
    s.units += it.quantity;
    bySeller.set(it.sellerNameSnapshot, s);
  }

  const [
    users,
    activeSellers,
    pendingSellers,
    liveProducts,
    toFulfil,
    awaitingPayment,
    disputes,
    tickets,
  ] = totals;

  return NextResponse.json({
    range,
    current,
    previous,
    series,
    statusCounts: Object.fromEntries(statusGroups.map(g => [g.status, g._count])),
    paymentMix: Object.fromEntries(paymentGroups.map(g => [g.paymentMethod, g._count])),
    topSellers: [...bySeller]
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    recentOrders: recent.map(o => ({
      id: o.id,
      total: o.totalAmount,
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      customer: o.user?.name ?? o.guestEmail ?? null,
    })),
    totals: {
      users,
      activeSellers,
      pendingSellers,
      liveProducts,
      toFulfil,
      awaitingPayment,
      disputes,
      tickets,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
