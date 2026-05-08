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

    const requestedAmount = parsed.data.amount ?? seller.balance;
    if (requestedAmount <= 0) {
      return NextResponse.json({ message: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (requestedAmount > seller.balance) {
      return NextResponse.json(
        { message: `Requested amount exceeds available balance (${seller.balance.toFixed(2)} EGP)` },
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

    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.payout.create({
        data: {
          sellerId: seller.id,
          amount: requestedAmount,
          status: 'PENDING',
          bankDetails,
        },
      });
      await tx.sellerProfile.update({
        where: { id: seller.id },
        data: { balance: { decrement: requestedAmount } },
      });
      return created;
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

    return NextResponse.json({
      balance: seller.balance,
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
