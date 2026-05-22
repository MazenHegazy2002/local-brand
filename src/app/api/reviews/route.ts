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

    const { productId, rating, comment } = validated.data;
    const userId = (session.user as SessionUser).id;

    // 1. Verify Purchase (Only allow reviews if the user bought and received it)
    const orderHistory = await prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        items: {
          some: {
            variant: { productId },
          },
        },
      },
    });

    const verifiedPurchase = !!orderHistory;

    // 2. Prevent Double Reviewing
    const existingReview = await prisma.review.findFirst({
      where: { userId, productId },
    });

    if (existingReview) {
      return NextResponse.json(
        { message: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    // 3. Create Review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
        verifiedPurchase,
      },
    });

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
