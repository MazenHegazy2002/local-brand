import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

async function getAuthUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return { id: token.sub as string, role: token.role as string };
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, { audience: 'mobile-access' });
      return { id: payload.id as string, role: payload.role as string };
    } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const [totalOrders, pendingOrders, totalProducts, earnings] = await Promise.all([
    prisma.orderItem.count({ where: { variant: { product: { sellerId: seller.id } } } }),
    prisma.orderItem.count({
      where: { variant: { product: { sellerId: seller.id } }, status: 'CONFIRMED' },
    }),
    prisma.product.count({ where: { sellerId: seller.id } }),
    prisma.orderItem.findMany({
      where: {
        variant: { product: { sellerId: seller.id } },
        status: { in: ['DELIVERED', 'CONFIRMED'] },
      },
      select: { priceAtPurchase: true, quantity: true },
    }),
  ]);

  const totalRevenue = earnings.reduce(
    (sum, item) => sum + Number(item.priceAtPurchase) * item.quantity,
    0
  );

  return NextResponse.json({ totalRevenue, totalOrders, pendingOrders, totalProducts });
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
