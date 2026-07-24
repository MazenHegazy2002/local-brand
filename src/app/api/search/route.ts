import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function sanitizeProduct(product: any, isGuest: boolean) {
  if (!isGuest) return product;
  const { sellerId: _sellerId, categoryId: _categoryId, deletedAt: _deletedAt, ...rest } = product;
  return rest;
}

function sanitizeCategory(category: any, isGuest: boolean) {
  if (!isGuest) return category;
  const { id: _id, parentId: _parentId, ...rest } = category;
  return rest;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isGuest = !session;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const suggest = searchParams.get('suggest') === '1';
    const skip = (page - 1) * limit;

    if (!q || q.length < 2) {
      return NextResponse.json({
        products: [],
        categories: [],
        suggestions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    const searchTerm = q.toLowerCase().trim();

    if (suggest) {
      const [products, categories] = await Promise.all([
        prisma.product.findMany({
          where: {
            published: true,
            deletedAt: null,
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { tags: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } },
            ],
          },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
          },
          take: 5,
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.category.findMany({
          where: { name: { contains: searchTerm, mode: 'insensitive' } },
          take: 3,
        }),
      ]);

      const suggestions = Array.from(
        new Set(products.map(p => p.title.split(/\s+/).slice(0, 3).join(' ')).filter(Boolean))
      ).slice(0, 5);

      const sanitizedProducts = products.map(p => sanitizeProduct(p, isGuest));
      const sanitizedCategories = categories.map(c => sanitizeCategory(c, isGuest));

      return NextResponse.json({
        products: sanitizedProducts,
        categories: sanitizedCategories,
        suggestions,
      });
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          published: true,
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { some: { name: { contains: searchTerm, mode: 'insensitive' } } } },
            { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true, status: true } },
          reviews: { select: { rating: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({
        where: {
          published: true,
          deletedAt: null,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    const productsWithRating = products.map(p => ({
      ...p,
      avgRating:
        p.reviews.length > 0
          ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
          : 0,
      reviewCount: p.reviews.length,
    }));

    const sanitizedProducts = productsWithRating.map(p => sanitizeProduct(p, isGuest));

    return NextResponse.json({
      products: sanitizedProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      query: q,
    });
  } catch (error) {
    console.error('[search] error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
