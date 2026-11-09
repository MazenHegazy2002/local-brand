import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productImageUrl } from '@/lib/image-url';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/export/public-sellers: every active seller with at least one live product,
// in a fixed order (oldest store first) so the app's sellers row doesn't reshuffle
// whenever someone uploads new products.
export async function GET(req: NextRequest) {
  try {
    const live = { published: true, deletedAt: null };
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'ACTIVE', products: { some: live } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        storeName: true,
        logoUrl: true,
        _count: { select: { products: { where: live } } },
        products: {
          where: live,
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { images: { select: { id: true, url: true, isPrimary: true }, take: 3 } },
        },
      },
    });

    const out = sellers.map(s => {
      const imgs = s.products[0]?.images ?? [];
      const img = imgs.find(i => i.isPrimary) || imgs[0];
      return {
        id: s.id,
        sellerId: s.id,
        name: s.storeName,
        brand: s.storeName,
        logoUrl: s.logoUrl,
        image: img ? productImageUrl(req, img) : null,
        productCount: s._count.products,
      };
    });

    return NextResponse.json(
      { sellers: out },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[public-sellers] failed:', error);
    return NextResponse.json(
      { error: 'Failed to load sellers' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
