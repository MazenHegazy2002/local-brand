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

  const topSellers = await prisma.sellerProfile.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, storeName: true },
    take: 10,
  }).then((profiles) => {
    return profiles.map(p => ({ id: p.id, storeName: p.storeName, sales: 0, revenue: 0 }));
  });

  return NextResponse.json({
    totalOrders: orders,
    newUsers: users,
    totalRevenue: revenue._sum.totalAmount || 0,
    conversionRate: 0.03,
    revenueChart,
    topSellers,
  });
}