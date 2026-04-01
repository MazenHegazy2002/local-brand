import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/seller/[id]/performance — admin/seller health score
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const currentUserId = (session.user as any).id;
    const resolvedParams = await params;
    const sellerId = resolvedParams.id;

    // Only admins or the seller themselves can view
    if (role !== 'ADMIN') {
      const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
      if (!profile || profile.userId !== currentUserId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    // Gather performance data
    const [totalOrders, cancelledOrders, returnedOrders, reviews] = await Promise.all([
      prisma.orderItem.count({
        where: { variant: { product: { sellerId } } }
      }),
      prisma.orderItem.count({
        where: { variant: { product: { sellerId } }, status: 'RETURNED' }
      }),
      prisma.order.count({
        where: { items: { some: { variant: { product: { sellerId } } } }, status: 'RETURNED' }
      }),
      prisma.review.findMany({
        where: { product: { sellerId }, rating: { gt: 0 } },
        select: { rating: true }
      })
    ]);

    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
    const avgRating = reviews.length > 0
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0;

    // Health score: 100 base - deductions for bad metrics
    let healthScore = 100;
    if (cancellationRate > 5) healthScore -= 20;
    if (cancellationRate > 15) healthScore -= 20;
    if (returnRate > 10) healthScore -= 15;
    if (avgRating < 3.5) healthScore -= 25;
    if (avgRating < 2.5) healthScore -= 25;
    healthScore = Math.max(0, healthScore);

    const status = healthScore >= 80 ? 'GOOD' : healthScore >= 60 ? 'WARNING' : 'AT_RISK';

    return NextResponse.json({
      sellerId,
      metrics: {
        totalOrders,
        cancellationRate: cancellationRate.toFixed(1) + '%',
        returnRate: returnRate.toFixed(1) + '%',
        averageRating: avgRating.toFixed(1),
        reviewCount: reviews.length,
      },
      healthScore,
      status,
      recommendation: status === 'AT_RISK'
        ? 'Account at risk of suspension. Improve fulfillment and customer satisfaction.'
        : status === 'WARNING'
        ? 'Performance needs improvement. Focus on reducing returns and improving ratings.'
        : 'Great performance! Keep it up.',
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
