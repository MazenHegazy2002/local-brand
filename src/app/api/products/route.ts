import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/client';

// GET /api/products?page=1&limit=12&category=&q=&minPrice=&maxPrice=&sort=&brand=&rating=&tags=&condition=&inStock=&flashSale=&ids=id1,id2,...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Special-case: batch fetch by explicit ids (used by RecentlyViewed and compare).
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 50); // hard cap to prevent abuse
      if (ids.length === 0) {
        return NextResponse.json({ products: [] }, { status: 200 });
      }
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, published: true, deletedAt: null },
        include: {
          images: { where: { isPrimary: true } },
          seller: { select: { storeName: true } },
          category: { select: { name: true, slug: true } },
        },
      });
      return NextResponse.json({ products }, { status: 200 });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(48, parseInt(searchParams.get('limit') || '12'));
    const skip = (page - 1) * limit;
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const sort = searchParams.get('sort') || 'newest';
    const rating = parseInt(searchParams.get('rating') || '0');
    const tags = searchParams.get('tags') || '';
    const condition = searchParams.get('condition') || '';
    const inStock = searchParams.get('inStock') === 'true';
    const flashSale = searchParams.get('flashSale') === 'true';

    const where: Prisma.ProductWhereInput = {
      published: true,
      deletedAt: null,
      basePrice: { gte: minPrice, lte: maxPrice },
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (brand) {
      where.seller = { storeName: brand };
    }

    if (condition) {
      where.condition = condition.toUpperCase();
    }

    if (flashSale) {
      where.flashSalePrice = { not: null };
      where.flashSaleEndsAt = { gt: new Date() };
    }

    if (inStock) {
      where.variants = {
        some: {
          stockCount: { gt: 0 }
        }
      };
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      where.tags = {
        some: {
          slug: { in: tagList },
        },
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price-asc':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { basePrice: 'desc' };
        break;
      case 'rating':
        orderBy = { reviews: { _count: 'desc' } };
        break;
      case 'featured':
        orderBy = { isFeatured: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const productsWithRating = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        images: { where: { isPrimary: true } },
        seller: { select: { storeName: true } },
        category: { select: { name: true, slug: true } },
        tags: true,
        _count: { select: { reviews: true } },
        reviews: {
          select: { rating: true },
        },
        variants: {
          select: { id: true, stockCount: true, price: true },
          orderBy: { stockCount: 'desc' },
        },
      }
    });

    let products = productsWithRating;
    if (rating > 0) {
      products = productsWithRating.filter(p => {
        const avgRating = p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : 0;
        return avgRating >= rating;
      });
    }

    const total = await prisma.product.count({ where });

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Products API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
