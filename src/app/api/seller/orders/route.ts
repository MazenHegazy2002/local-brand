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

  const status = new URL(req.url).searchParams.get('status');

  const items = await prisma.orderItem.findMany({
    where: {
      variant: { product: { sellerId: seller.id } },
      ...(status ? { status: status as never } : {}),
    },
    select: {
      id: true,
      status: true,
      priceAtPurchase: true,
      quantity: true,
      order: { select: { id: true, createdAt: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
    take: 50,
  });

  // Group by order
  const orderMap = new Map<
    string,
    { id: string; status: string; total: number; createdAt: string; itemCount: number }
  >();
  for (const item of items) {
    const oid = item.order.id;
    if (!orderMap.has(oid)) {
      orderMap.set(oid, {
        id: oid,
        status: item.status,
        total: 0,
        createdAt: item.order.createdAt.toISOString(),
        itemCount: 0,
      });
    }
    const entry = orderMap.get(oid)!;
    entry.total += Number(item.priceAtPurchase) * item.quantity;
    entry.itemCount += item.quantity;
  }

  return NextResponse.json({ orders: Array.from(orderMap.values()) });
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
