import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { productImageUrl } from '@/lib/image-url';

// One of the buyer's own orders (mobile order tracking screen).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      shippingFee: true,
      paymentMethod: true,
      paymentStatus: true,
      createdAt: true,
      deliveredAt: true,
      shipments: { select: { shippedAt: true }, take: 1 },
      shippingAddressSnapshot: true,
      items: {
        select: {
          id: true,
          quantity: true,
          priceAtPurchase: true,
          productTitleSnapshot: true,
          selectedSize: true,
          selectedColor: true,
          status: true,
          variant: {
            select: {
              product: {
                select: {
                  title: true,
                  images: {
                    select: { id: true, url: true },
                    orderBy: { isPrimary: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const img = (i: { id: string; url: string } | undefined) => (i ? productImageUrl(req, i) : null);

  return NextResponse.json({
    order: {
      ...order,
      total: Number(order.totalAmount),
      shippedAt: order.shipments[0]?.shippedAt ?? null,
      items: order.items.map(i => ({
        ...i,
        title: i.productTitleSnapshot || i.variant?.product.title,
        image: img(i.variant?.product.images[0]),
        price: Number(i.priceAtPurchase),
      })),
    },
  });
}
