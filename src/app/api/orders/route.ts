import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

// Buyer's own orders, newest first (mobile "My orders").
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          productTitleSnapshot: true,
          variant: {
            select: {
              product: {
                select: {
                  title: true,
                  images: { select: { url: true }, orderBy: { isPrimary: 'desc' }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    orders: orders.map(o => ({
      id: o.id,
      status: o.status,
      total: Number(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      title: o.items[0]?.productTitleSnapshot || o.items[0]?.variant?.product.title || 'Order',
      image: o.items[0]?.variant?.product.images[0]?.url ?? null,
    })),
  });
}
