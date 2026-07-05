import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProductVariant } from '@/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trending = await prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
      where: {
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { not: 'CANCELLED' },
        },
      },
    });

    const variantIds = trending.map(t => t.variantId);

    const products = await prisma.product.findMany({
      where: {
        variants: { some: { id: { in: variantIds } } },
        published: true,
        deletedAt: null,
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: { select: { storeName: true } },
        variants: true,
      },
      take: limit,
    });

    const sorted = variantIds
      .map(vid => products.find(p => p.variants?.some((v: ProductVariant) => v.id === vid)))
      .filter(Boolean);

    return NextResponse.json({ products: sorted });
  } catch (error) {
    console.error('[trending] error:', error);
    return NextResponse.json({ error: 'Failed to load trending products' }, { status: 500 });
  }
}
