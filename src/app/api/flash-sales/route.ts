import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/flash-sales — live flash-sale products that have started and not yet expired
export async function GET() {
  try {
    const now = new Date();

    const products = await prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        flashSalePrice: { not: null },
        flashSaleEndsAt: { gt: now },
        // Only show flash sales that have already started (null = start immediately)
        OR: [{ flashSaleStartsAt: null }, { flashSaleStartsAt: { lte: now } }],
      },
      select: {
        id: true,
        title: true,
        basePrice: true,
        flashSalePrice: true,
        flashSaleEndsAt: true,
        flashSaleLimit: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        seller: { select: { storeName: true } },
        category: { select: { name: true } },
        variants: { select: { stockCount: true } },
      },
      orderBy: { flashSaleEndsAt: 'asc' },
      take: 100,
    });

    const result = products.map(({ variants, basePrice, flashSalePrice, ...p }) => ({
      ...p,
      basePrice: Number(basePrice),
      flashSalePrice: Number(flashSalePrice),
      stockCount: variants.reduce(
        (sum: number, v: { stockCount: number }) => sum + v.stockCount,
        0
      ),
    }));

    return NextResponse.json({ products: result });
  } catch (error) {
    console.error('[flash-sales] error:', error);
    return NextResponse.json({ products: [] });
  }
}
