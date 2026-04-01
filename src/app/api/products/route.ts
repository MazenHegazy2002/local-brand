import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/products?page=1&limit=12&category=&q=&minPrice=&maxPrice=&sort=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(48, parseInt(searchParams.get('limit') || '12'));
    const skip = (page - 1) * limit;
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const sort = searchParams.get('sort') || 'newest';

    const where: any = {
      published: true,
      deletedAt: null,
      basePrice: { gte: minPrice, lte: maxPrice },
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    const orderBy: any = {
      newest: { createdAt: 'desc' },
      oldest: { createdAt: 'asc' },
      price_asc: { basePrice: 'asc' },
      price_desc: { basePrice: 'desc' },
      featured: { isFeatured: 'desc' },
    }[sort] || { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true } },
          seller: { select: { storeName: true } },
          category: { select: { name: true, slug: true } },
          _count: { select: { reviews: true } },
        }
      }),
      prisma.product.count({ where }),
    ]);

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
