import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const brands = await prisma.sellerProfile.findMany({
      where: { status: 'ACTIVE' },
      select: { storeName: true },
      orderBy: { storeName: 'asc' },
    });

    const tags = await prisma.tag.findMany({
      select: { name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    const categories = await prisma.category.findMany({
      where: { parentId: null },
      select: { name: true, slug: true, children: { select: { name: true, slug: true } } },
      orderBy: { name: 'asc' },
    });

    const priceRange = await prisma.product.aggregate({
      where: { published: true, deletedAt: null },
      _min: { basePrice: true },
      _max: { basePrice: true },
    });

    const formattedBrands = brands.map(b => ({
      storeName: b.storeName,
      storeSlug: b.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));

    return NextResponse.json(
      {
        brands: formattedBrands,
        tags,
        categories,
        priceRange: {
          min: priceRange._min.basePrice || 0,
          max: priceRange._max.basePrice || 10000,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Filters API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
