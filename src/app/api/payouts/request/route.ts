import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const requestPayoutSchema = z.object({
  amount: z.number().positive().optional(),
  bankDetails: z.string().min(5).optional(),
});

// POST /api/payouts/request — seller requests a payout from their balance
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;

    if (role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = requestPayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    if (seller.status !== 'ACTIVE') {
      return NextResponse.json(
        { message: 'Seller account is not active. Payouts are paused.' },
        { status: 403 }
      );
    }

    // Compute the seller's *available* balance from real orders + escrow
    // window. The legacy seller.balance column is no longer authoritative.
    const { computeSellerEarnings } = await import('@/lib/seller-earnings');
    const earnings = await computeSellerEarnings(seller.id);

    const requestedAmount = parsed.data.amount ?? earnings.available;
    if (requestedAmount <= 0) {
      return NextResponse.json({ message: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (requestedAmount > earnings.available) {
      return NextResponse.json(
        {
          message: `Requested amount exceeds available balance (${earnings.available.toFixed(2)} EGP). ${
            earnings.held > 0
              ? `${earnings.held.toFixed(2)} EGP is still in escrow until ${
                  earnings.nextReleaseAt
                    ? earnings.nextReleaseAt.toISOString().split('T')[0]
                    : 'release'
                }.`
              : ''
          }`,
        },
        { status: 400 }
      );
    }

    const bankDetails = parsed.data.bankDetails ?? seller.bankAccount;
    if (!bankDetails) {
      return NextResponse.json(
        { message: 'Bank details are required. Update them in Store Settings first.' },
        { status: 400 }
      );
    }

    // No need to decrement seller.balance — it's no longer the source of
    // truth. Outstanding (PENDING/PROCESSING/PAID) payouts are subtracted
    // from earnings on every read inside computeSellerEarnings.
    const payout = await prisma.payout.create({
      data: {
        sellerId: seller.id,
        amount: requestedAmount,
        status: 'PENDING',
        bankDetails,
      },
    });

    return NextResponse.json({ success: true, payout }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[payouts/request] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to request payout' },
      { status: 500 }
    );
  }
}

// GET /api/payouts/request — list this seller's payout history
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    if (role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    const payouts = await prisma.payout.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const { computeSellerEarnings } = await import('@/lib/seller-earnings');
    const earnings = await computeSellerEarnings(seller.id);

    return NextResponse.json({
      balance: earnings.available,
      heldBalance: earnings.held,
      nextReleaseAt: earnings.nextReleaseAt ? earnings.nextReleaseAt.toISOString() : null,
      bankAccount: seller.bankAccount,
      payouts,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[payouts/request] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to load payout history' },
      { status: 500 }
    );
  }
}
