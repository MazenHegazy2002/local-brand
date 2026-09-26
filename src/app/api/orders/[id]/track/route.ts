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

    // Get order - exact ID match only (case-insensitive)
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: { equals: orderId, mode: 'insensitive' as const } },
          ...(cleanId && cleanId !== orderId
            ? [{ id: { equals: cleanId, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      include: {
        user: { select: { id: true, email: true } },
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
      return NextResponse.json(
        { message: `Order '${cleanId}' not found. Please check your order reference number.` },
        { status: 404 }
      );
    }

    // Authorization check
    const normalizedGuestEmail = guestEmail?.trim().toLowerCase();
    const ownsAsUser = Boolean(userId && order.userId && order.userId === userId);
    const orderGuestEmail = order.guestEmail?.trim().toLowerCase();
    const orderUserEmail = order.user?.email?.trim().toLowerCase();

    // Guest access requires a valid, matching email provided in query params
    const ownsAsGuest = Boolean(
      normalizedGuestEmail &&
      ((orderGuestEmail && orderGuestEmail === normalizedGuestEmail) ||
        (orderUserEmail && orderUserEmail === normalizedGuestEmail))
    );

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
