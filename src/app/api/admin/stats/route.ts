import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

async function getAdminUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role === 'ADMIN') return true;
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, { audience: 'mobile-access' });
      return payload.role === 'ADMIN';
    } catch {}
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!(await getAdminUser(req)))
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
