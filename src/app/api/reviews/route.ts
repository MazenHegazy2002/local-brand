import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { createReviewSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createReviewSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { productId, orderItemId, rating, comment } = validated.data;
    const userId = (session.user as SessionUser).id;

    // 1. Verify Purchase (Only allow reviews if the user bought and received it via this specific order item)
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        status: 'DELIVERED',
        order: { userId },
        variant: { productId },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ message: 'Item not delivered or invalid order' }, { status: 400 });
    }

    // 2. Prevent Double Reviewing on the same order item
    const existingReview = await prisma.review.findFirst({
      where: { orderItemId },
    });

    if (existingReview) {
      return NextResponse.json({ message: 'You have already reviewed this item' }, { status: 400 });
    }

    // 3. Create Review and award points atomically
    const { POINTS_PER_REVIEW } = await import('@/lib/loyalty-constants');

    const [review] = await prisma.$transaction([
      prisma.review.create({
        data: {
          userId,
          productId,
          orderItemId,
          rating,
          comment,
          verifiedPurchase: true,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: POINTS_PER_REVIEW } },
      }),
    ]);

    return NextResponse.json({ message: 'Review successfully submitted', review }, { status: 201 });
  } catch (error) {
    console.error('Review Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating =
      reviews.length > 0 ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length : 0;

    return NextResponse.json(
      {
        reviews,
        stats: { total: reviews.length, averageRating: averageRating.toFixed(1) },
      },
      { status: 200 }
    );
  } catch (_error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
