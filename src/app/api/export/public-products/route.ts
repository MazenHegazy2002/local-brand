import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { productImageUrl } from '@/lib/image-url';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    const newest = await prisma.product.findMany({
      where: {
        published: true,
        seller: { status: 'ACTIVE' },
        deletedAt: null,
      },
      // Read a wider window than `limit`, then mix sellers (below) so one big upload
      // doesn't fill the whole feed with a single store.
      take: Math.min(limit * 8, 800),
      select: {
        id: true,
        sellerId: true,
        title: true,
        titleAr: true,
        slug: true,
        description: true,
        basePrice: true,
        condition: true,
        isFeatured: true,
        brand: true,
        brandRef: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        seller: {
          select: {
            storeName: true,
            logoUrl: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
          },
          take: 5,
        },
        variants: {
          select: {
            id: true,
            title: true,
            price: true,
            stockCount: true,
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Round-robin by seller (each seller's own items stay newest-first).
    const bySeller = new Map<string, typeof newest>();
    for (const p of newest) {
      const list = bySeller.get(p.sellerId);
      if (list) list.push(p);
      else bySeller.set(p.sellerId, [p]);
    }
    const queues = [...bySeller.values()];
    const products: typeof newest = [];
    for (let i = 0; products.length < limit && queues.some(q => i < q.length); i++) {
      for (const q of queues) {
        if (i < q.length && products.length < limit) products.push(q[i]);
      }
    }

    // Images stored inline as base64 made this response ~12 MB. Point data: URLs
    // at the streaming route instead so each image is fetched and cached separately.
    const imgUrl = (img: { id: string; url: string }) => productImageUrl(req, img);

    const formatted = products.map(p => {
      const primary = p.images.find(img => img.isPrimary) || p.images[0];
      const primaryImg = primary ? imgUrl(primary) : 'https://via.placeholder.com/400';
      const brandName =
        p.brandRef?.name || p.brand || p.seller?.storeName || 'Egyptian Local Brand';

      return {
        id: p.id,
        // Common title & name aliases
        title: p.title,
        name: p.title,
        titleAr: p.titleAr || p.title,
        slug: p.slug,

        // Common price aliases
        price: p.basePrice,
        priceEGP: p.basePrice,
        basePrice: p.basePrice,

        // Common brand aliases
        brand: brandName,
        brandName: brandName,

        // Category & Seller
        category: p.category?.name || 'General',
        categorySlug: p.category?.slug || 'general',
        storeName: p.seller?.storeName || brandName,
        sellerId: p.sellerId,

        // Common image aliases
        image: primaryImg,
        imageUrl: primaryImg,
        thumbnail: primaryImg,
        images: p.images.map(imgUrl),

        // Description & Stock
        description: p.description,
        inStock: p.variants.some(v => v.stockCount > 0),
        available: p.variants.some(v => v.stockCount > 0),
        variantsCount: p.variants.length,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: formatted.length,
        products: formatted,
      },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export public products' },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
