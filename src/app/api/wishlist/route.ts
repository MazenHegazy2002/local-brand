import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/mobile-auth';

export async function GET(req: Request) {
  try {
    // Bearer (mobile) or session cookie (web).
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = user.role;
    if (role && role !== 'BUYER') {
      return NextResponse.json(
        { message: 'Only customers can use the wishlist.' },
        { status: 403 }
      );
    }

    const userId = user.id;

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            seller: { select: { storeName: true } },
            variants: {
              select: { id: true, stockCount: true, price: true },
              orderBy: { stockCount: 'desc' },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    // `items` is the flat shape the mobile app reads; web keeps using `wishlist`.
    const items = wishlist.map(w => ({
      id: w.product.id, // wishlist rows are keyed by (user, product)
      product: {
        id: w.product.id,
        title: w.product.title,
        basePrice: w.product.basePrice,
        image: w.product.images.find(i => i.isPrimary)?.url ?? w.product.images[0]?.url ?? null,
        brand: w.product.seller?.storeName ?? '',
        inStock: w.product.variants.some(v => v.stockCount > 0),
      },
    }));
    return NextResponse.json({ wishlist, items }, { status: 200 });
  } catch (_error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Bearer (mobile) or session cookie (web).
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = user.role;
    if (role && role !== 'BUYER') {
      return NextResponse.json(
        { message: 'Only customers can use the wishlist.' },
        { status: 403 }
      );
    }

    const { productId } = await req.json();
    const userId = user.id;

    if (!productId) {
      return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }

    // Toggle wishlist logic
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } },
      });
      return NextResponse.json(
        { message: 'Removed from wishlist', action: 'removed' },
        { status: 200 }
      );
    } else {
      await prisma.wishlist.create({
        data: { userId, productId },
      });
      return NextResponse.json({ message: 'Added to wishlist', action: 'added' }, { status: 201 });
    }
  } catch (_error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
