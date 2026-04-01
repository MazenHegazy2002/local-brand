import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Product comparison API
 * GET /api/products/compare?ids=id1,id2,id3
 * Returns products with specs aligned for side-by-side comparison
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  if (!idsParam) return NextResponse.json({ message: 'ids query param required (comma-separated)' }, { status: 400 });

  const ids = idsParam.split(',').slice(0, 4); // max 4
  if (ids.length < 2) return NextResponse.json({ message: 'At least 2 product IDs required' }, { status: 400 });

  try {
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, published: true },
      include: {
        images: { where: { isPrimary: true } },
        seller: { select: { storeName: true } },
        category: { select: { name: true } },
        variants: { orderBy: { price: 'asc' }, take: 1 },
        _count: { select: { reviews: true } }
      }
    });

    if (!products.length) return NextResponse.json({ message: 'No products found' }, { status: 404 });

    // Build comparison spec keys union from all products' attributes
    const allSpecKeys = new Set<string>();
    products.forEach(p => {
      const attributesStr = p.variants[0]?.attributes;
      if (attributesStr) {
        try {
          const attributes = JSON.parse(attributesStr);
          Object.keys(attributes).forEach(k => allSpecKeys.add(k));
        } catch (e) {}
      }
    });

    const comparison = products.map(p => {
      let specs = {};
      try {
        if (p.variants[0]?.attributes) {
          specs = JSON.parse(p.variants[0].attributes);
        }
      } catch (e) {}
      return {
        id: p.id,
        title: p.title,
        image: p.images[0]?.url || null,
        basePrice: p.basePrice,
        seller: p.seller.storeName,
        category: p.category?.name,
        stockCount: p.variants[0]?.stockCount ?? 0,
        reviewCount: p._count.reviews,
        condition: p.condition,
        weightGrams: p.weightGrams,
        specs,
      };
    });

    return NextResponse.json({
      products: comparison,
      specKeys: Array.from(allSpecKeys),
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
