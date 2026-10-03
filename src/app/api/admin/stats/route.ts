import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  if ((await getRequestUser(req))?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [revenue, orders, users, sellers] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: today }, paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.sellerProfile.count({ where: { status: 'PENDING_APPROVAL' } }),
  ]);

  return NextResponse.json({
    revenue: Number(revenue._sum.totalAmount ?? 0),
    orders,
    users,
    sellers,
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
