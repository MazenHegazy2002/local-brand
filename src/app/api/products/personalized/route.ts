import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ products: [] });

    const userId = (session.user as { id: string }).id;
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '10');

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: { product: { select: { categoryId: true, sellerId: true } } },
      take: 20,
    });

    if (wishlist.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const categories = [...new Set(wishlist.map(w => w.product.categoryId))];
    const excludeIds = wishlist.map(w => w.productId);

    const products = await prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        categoryId: { in: categories },
        id: { notIn: excludeIds },
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: { select: { storeName: true } },
      },
      take: limit,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[personalized] error:', error);
    return NextResponse.json({ error: 'Failed to load personalized products' }, { status: 500 });
  }
}
