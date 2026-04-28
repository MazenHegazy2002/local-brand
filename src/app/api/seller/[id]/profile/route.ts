import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/seller/[id]/profile — public seller storefront
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const sellerId = resolvedParams.id;

    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId, status: 'ACTIVE', deletedAt: null },
      include: {
        user: { select: { name: true, createdAt: true } },
        products: {
          where: { published: true, deletedAt: null },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: { images: { where: { isPrimary: true } } }
        }
      }
    });

    if (!seller) return NextResponse.json({ message: 'Seller not found' }, { status: 404 });

    // Aggregate rating from reviews
    const reviews = await prisma.review.findMany({
      where: { product: { sellerId } },
      select: { rating: true }
    });

    const avgRating = reviews.length
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({
      seller: {
        id: seller.id,
        storeName: seller.storeName,
        description: seller.description,
        logoUrl: seller.logoUrl,
        memberSince: seller.user.createdAt,
        productCount: seller.products.length,
        averageRating: avgRating.toFixed(1),
        reviewCount: reviews.length,
      },
      products: seller.products,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
