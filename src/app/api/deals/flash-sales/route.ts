import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/deals/flash-sales
 * Returns active flash sales
 */
export async function GET() {
  try {
    const now = new Date();

    const flashSales = await prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        flashSalePrice: { not: null },
        flashSaleEndsAt: { gt: now }
      },
      include: {
        images: { where: { isPrimary: true } },
        variants: { take: 1 }
      },
      orderBy: { flashSaleEndsAt: 'asc' },
      take: 20
    });

    const parsedSales = flashSales.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      originalPrice: p.basePrice,
      flashPrice: p.flashSalePrice,
      discountPercentage: Math.round(((p.basePrice - p.flashSalePrice!) / p.basePrice) * 100),
      endsAt: p.flashSaleEndsAt,
      image: p.images[0]?.url,
      stock: p.variants[0]?.stockCount ?? 0
    }));

    return NextResponse.json({ flashSales: parsedSales }, { status: 200 });
  } catch (error) {
    console.error('Flash Sales Error', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
