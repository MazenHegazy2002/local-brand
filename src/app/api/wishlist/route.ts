import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            variants: {
              select: { id: true, stockCount: true, price: true },
              orderBy: { stockCount: 'desc' },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' }
    });

    return NextResponse.json({ wishlist }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { productId } = await req.json();
    const userId = (session.user as SessionUser).id;

    if (!productId) {
      return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }

    // Toggle wishlist logic
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId }
      }
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } }
      });
      return NextResponse.json({ message: 'Removed from wishlist', action: 'removed' }, { status: 200 });
    } else {
      await prisma.wishlist.create({
        data: { userId, productId }
      });
      return NextResponse.json({ message: 'Added to wishlist', action: 'added' }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
