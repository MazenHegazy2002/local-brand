import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '30d';

  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orders, users, revenue] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startDate } } }),
    prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'BUYER' } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startDate }, paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    }),
  ]);

  const dailyOrders = await prisma.order.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: startDate }, paymentStatus: 'PAID' },
    _sum: { totalAmount: true },
    orderBy: { createdAt: 'asc' },
  });

  const revenueChart = dailyOrders.map(o => ({
    date: new Date(o.createdAt).toLocaleDateString(),
    revenue: o._sum.totalAmount || 0,
  }));

  // Real top sellers by revenue
  const sellerRevenue = await prisma.orderItem.groupBy({
    by: ['variantId'],
    where: { order: { createdAt: { gte: startDate }, paymentStatus: 'PAID' } },
    _sum: { priceAtPurchase: true },
    _count: { id: true },
  });

  const variantIds = sellerRevenue.map(s => s.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { include: { seller: true } } },
  });

  const sellerMap: Record<
    string,
    { id: string; storeName: string; sales: number; revenue: number; rating: number | null }
  > = {};
  for (const sv of sellerRevenue) {
    const variant = variants.find(v => v.id === sv.variantId);
    if (!variant?.product?.seller) continue;
    const sid = variant.product.seller.id;
    if (!sellerMap[sid]) {
      sellerMap[sid] = {
        id: sid,
        storeName: variant.product.seller.storeName,
        sales: 0,
        revenue: 0,
        rating: null,
      };
    }
    sellerMap[sid].sales += (sv._count as any).id;
    sellerMap[sid].revenue += Number((sv._sum as any).priceAtPurchase || 0);
  }
  const topSellers = Object.values(sellerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top products by sales volume
  const productRevenue = await prisma.orderItem.groupBy({
    by: ['productTitleSnapshot'],
    where: { order: { createdAt: { gte: startDate }, paymentStatus: 'PAID' } },
    _sum: { priceAtPurchase: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topProducts = productRevenue.map(p => ({
    title: p.productTitleSnapshot,
    sales: (p._count as any).id,
    revenue: Number((p._sum as any).priceAtPurchase || 0),
  }));

  // Returns analytics
  const returnRequests = await prisma.returnRequest
    .groupBy({
      by: ['reason'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    })
    .catch(() => [] as any[]);

  const totalReturns = returnRequests.reduce((sum, r) => sum + ((r._count as any).id || 0), 0);
  const returnsByReason = returnRequests.map(r => ({
    reason: r.reason,
    count: (r._count as any).id || 0,
  }));

  // Most returned products (Task 5) — traverse returnRequest → orderItem for title
  const returnedItems = await prisma.returnRequest
    .findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        orderItem: {
          select: { productTitleSnapshot: true },
        },
      },
    })
    .catch(() => [] as any[]);

  const returnProductCounts: Record<string, number> = {};
  for (const ret of returnedItems) {
    const title = ret.orderItem?.productTitleSnapshot || 'Unknown';
    returnProductCounts[title] = (returnProductCounts[title] || 0) + 1;
  }
  const mostReturnedProducts = Object.entries(returnProductCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totalOrders: orders,
    newUsers: users,
    totalRevenue: revenue._sum.totalAmount || 0,
    conversionRate: orders > 0 && users > 0 ? Math.min(1, orders / Math.max(users, 1)) : 0,
    revenueChart,
    topSellers,
    topProducts,
    returns: { total: totalReturns, byReason: returnsByReason },
    mostReturnedProducts,
  });
}
