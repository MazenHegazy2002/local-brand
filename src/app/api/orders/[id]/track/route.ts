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

    const cleanId = orderId.replace(/^[#ORD\-]+/i, '').trim();

    // Get order - allow by full order ID or short ID prefix/suffix + (user ID match OR email match)
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { id: cleanId },
          { id: { startsWith: cleanId } },
          { id: { endsWith: cleanId } },
        ],
      },
      include: {
        user: { select: { email: true } },
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
    const normalizedGuestEmail = guestEmail?.toLowerCase();
    const ownsAsUser = !!userId && order.userId === userId;
    const ownsAsGuest =
      !!normalizedGuestEmail &&
      (order.guestEmail?.toLowerCase() === normalizedGuestEmail ||
        order.user?.email?.toLowerCase() === normalizedGuestEmail);
    const isOwner = ownsAsUser || ownsAsGuest;
    let isAuthorized = isOwner || role === 'ADMIN';

    if (!isAuthorized && role === 'SELLER') {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: userId || '' },
      });
      if (sellerProfile) {
        const ownsItem = order.items.some(
          item => item.variant?.product?.sellerId === sellerProfile.id
        );
        if (ownsItem) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
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
