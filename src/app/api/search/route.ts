import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], total: 0, page, limit, totalPages: 0 });
  }

  const searchTerm = q.toLowerCase().trim();
  
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
        images: { where: { isPrimary: true }, take: 1 },
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

  const productsWithRating = products.map((p) => ({
    ...p,
    avgRating: p.reviews.length > 0
      ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
      : 0,
    reviewCount: p.reviews.length,
  }));

  return NextResponse.json({
    products: productsWithRating,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    query: q,
  });
}