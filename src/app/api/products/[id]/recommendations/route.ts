import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const productId = params.id;

    // 1. Get the target product to find its category
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, sellerId: true }
    });

    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    // 2. Fetch recommendations (Same category, excluding itself, prioritizing same seller slightly or featured)
    const recommendations = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
        published: true,
      },
      take: 4,
      include: {
        images: { where: { isPrimary: true } },
        seller: { select: { storeName: true } }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // 3. Fallback (If not enough in same category, get random recs)
    if (recommendations.length < 4) {
      const moreRecs = await prisma.product.findMany({
        where: {
          id: { notIn: [productId, ...recommendations.map(r => r.id)] },
          published: true,
        },
        take: 4 - recommendations.length,
        include: {
          images: { where: { isPrimary: true } },
          seller: { select: { storeName: true } }
        }
      });
      recommendations.push(...moreRecs);
    }

    return NextResponse.json({ recommendations }, { status: 200 });
  } catch (error) {
    console.error('Recommendations Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
