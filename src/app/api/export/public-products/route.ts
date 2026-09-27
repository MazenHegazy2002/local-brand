import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const products = await prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      take: limit,
      select: {
        id: true,
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

    const formatted = products.map(p => {
      const primaryImg =
        p.images.find(img => img.isPrimary)?.url ||
        p.images[0]?.url ||
        'https://via.placeholder.com/400';
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

        // Common image aliases
        image: primaryImg,
        imageUrl: primaryImg,
        thumbnail: primaryImg,
        images: p.images.map(img => img.url),

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
