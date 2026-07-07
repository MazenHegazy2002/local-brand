import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const guestEmail = searchParams.get('email');
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    let userId: string | null = null;
    let role: string | null = null;

    // Check for authenticated session
    const session = await getServerSession(authOptions);
    if (session) {
      userId = (session.user as SessionUser).id;
      role = (session.user as SessionUser).role;
    }

    // Get order - allow by order ID + (user ID match OR email match for guests)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                    seller: { select: { storeName: true } },
                  },
                },
              },
            },
          },
        },
        shipments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Authorization check
    const isOwner = order.userId === userId || order.guestEmail === guestEmail;
    const isSellerOrAdmin = role === 'SELLER' || role === 'ADMIN';

    if (!isOwner && !isSellerOrAdmin) {
      return NextResponse.json({ message: 'Forbidden - Invalid order or email' }, { status: 403 });
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          shippingFee: order.shippingFee,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
          shippingAddressSnapshot: order.shippingAddressSnapshot,
          items: order.items.map(item => ({
            id: item.id,
            productTitleSnapshot: item.productTitleSnapshot,
            priceAtPurchase: item.priceAtPurchase,
            quantity: item.quantity,
            status: item.status,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            variant: item.variant
              ? {
                  title: item.variant.title,
                  product: {
                    images: item.variant.product?.images || [],
                  },
                }
              : null,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Track Order Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
