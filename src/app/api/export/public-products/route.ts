import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
          take: 3,
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
        title: p.title,
        titleAr: p.titleAr || p.title,
        slug: p.slug,
        priceEGP: p.basePrice,
        brand: brandName,
        category: p.category?.name || 'General',
        image: primaryImg,
        images: p.images.map(img => img.url),
        description: p.description,
        inStock: p.variants.some(v => v.stockCount > 0),
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
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export public products' },
      { status: 500 }
    );
  }
}
