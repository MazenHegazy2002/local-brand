import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser, Product } from '@/types';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const productId = params.id;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'similar';
    const limit = Math.min(20, parseInt(searchParams.get('limit') || '12'));

    const session = await getServerSession(authOptions);
    let userId = (session?.user as SessionUser)?.id;

    const targetProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, tags: true, seller: true },
    });

    if (!targetProduct) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    let recommendations: Product[] = [];

    switch (type) {
      case 'trending':
        recommendations = (await getTrending(limit)) as unknown as Product[];
        break;
      case 'personalized':
        if (!userId) {
          recommendations = (await getTrending(limit)) as unknown as Product[];
        } else {
          const wishlist = await prisma.wishlist.findMany({
            where: { userId },
            select: { productId: true },
          });
          const wishlistIds = wishlist.map(w => w.productId);
          if (wishlistIds.length === 0) {
            recommendations = (await getTrending(limit)) as unknown as Product[];
          } else {
            const products = await prisma.product.findMany({
              where: { id: { in: wishlistIds } },
              select: { categoryId: true },
            });
            const catIds = [...new Set(products.map(p => p.categoryId))];
            recommendations = (await prisma.product.findMany({
              where: {
                id: { not: productId },
                published: true,
                deletedAt: null,
                categoryId: { in: catIds },
              },
              take: limit,
              include: {
                images: { where: { isPrimary: true } },
                seller: { select: { storeName: true } },
              },
              orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
            })) as unknown as Product[];
          }
        }
        break;
      default: {
        const similar = (await getSimilar(
          targetProduct as unknown as Product,
          productId,
          limit
        )) as unknown as Product[];
        // B-050: Fall back to trending if no category-similar products exist
        recommendations =
          similar.length > 0 ? similar : ((await getTrending(limit)) as unknown as Product[]);
      }
    }

    return NextResponse.json({ recommendations, type }, { status: 200 });
  } catch (error) {
    console.error('Recommendations Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

async function getSimilar(product: Product, productId: string, limit: number) {
  return prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: productId },
      published: true,
      deletedAt: null,
    },
    take: limit,
    include: { images: { where: { isPrimary: true } }, seller: { select: { storeName: true } } },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
}

async function getTrending(limit: number) {
  return prisma.product.findMany({
    where: { published: true, deletedAt: null },
    take: limit,
    include: { images: { where: { isPrimary: true } }, seller: { select: { storeName: true } } },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
}
