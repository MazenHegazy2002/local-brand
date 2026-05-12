import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

// GET /api/seller/[id]/wallet — seller balance & transaction ledger
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    const resolvedParams = await params;
    const sellerId = resolvedParams.id;

    const profile = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!profile) return NextResponse.json({ message: 'Seller not found' }, { status: 404 });

    // Only the seller or admin can access wallet
    if (role !== 'ADMIN' && profile.userId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Build transaction ledger from delivered orders
    const deliveredItems = await prisma.orderItem.findMany({
      where: {
        variant: { product: { sellerId } },
        status: 'DELIVERED',
      },
      include: {
        order: { select: { createdAt: true, id: true, deliveredAt: true, updatedAt: true } },
        variant: { include: { product: { select: { title: true } } } },
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: 50,
    });

    const { ESCROW_DAYS, computeSellerEarnings } = await import('@/lib/seller-earnings');
    const earnings = await computeSellerEarnings(sellerId);

    const escrowMs = ESCROW_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - escrowMs);

    const transactions = deliveredItems.map(item => {
      const gross = item.priceAtPurchase * item.quantity;
      const commission = gross * profile.commissionRate;
      const net = gross - commission;
      const delivered = item.order.deliveredAt ?? item.order.updatedAt;
      const status: 'available' | 'held' = delivered <= cutoff ? 'available' : 'held';
      return {
        orderId: item.orderId,
        date: item.order.createdAt,
        deliveredAt: delivered,
        product: item.productTitleSnapshot,
        qty: item.quantity,
        grossEGP: gross.toFixed(2),
        commissionEGP: commission.toFixed(2),
        netEGP: net.toFixed(2),
        status,
      };
    });

    return NextResponse.json(
      {
        balance: earnings.available.toFixed(2),
        heldBalance: earnings.held.toFixed(2),
        totalEarned: earnings.totalEarned.toFixed(2),
        totalPaidOut: earnings.totalPaidOut.toFixed(2),
        escrowDays: ESCROW_DAYS,
        nextReleaseAt: earnings.nextReleaseAt ? earnings.nextReleaseAt.toISOString() : null,
        commissionRate: `${(profile.commissionRate * 100).toFixed(0)}%`,
        transactions,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
