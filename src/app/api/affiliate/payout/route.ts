// src/app/api/affiliate/payout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { AffiliatePayoutMethod } from '@/generated/client';

const PayoutSchema = z.object({
  method: z.enum(['VODAFONE_CASH', 'ORANGE_MONEY', 'ETISALAT_CASH', 'INSTAPAY', 'BANK_TRANSFER']),
  payoutDetails: z.string().min(5).max(200),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
  });

  if (!affiliate || affiliate.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'No active affiliate account.' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async tx => {
      // 1. Get confirmed, unpaid commissions
      const confirmedCommissions = await tx.commission.findMany({
        where: {
          affiliateId: affiliate.id,
          status: 'CONFIRMED',
          payoutId: null,
        },
      });

      if (confirmedCommissions.length === 0) {
        throw new Error('No confirmed earnings available to pay out.');
      }

      const totalAmount = confirmedCommissions.reduce((sum, c) => sum + Number(c.commissionEgp), 0);

      // 2. Create the payout request
      const payout = await tx.affiliatePayout.create({
        data: {
          affiliateId: affiliate.id,
          amountEgp: totalAmount,
          method: parsed.data.method as AffiliatePayoutMethod,
          payoutDetails: parsed.data.payoutDetails,
          status: 'REQUESTED',
        },
      });

      // 3. Mark commissions as paid under this payoutId, ensuring payoutId: null
      const updated = await tx.commission.updateMany({
        where: {
          id: { in: confirmedCommissions.map(c => c.id) },
          payoutId: null,
        },
        data: { payoutId: payout.id },
      });

      if (updated.count !== confirmedCommissions.length) {
        throw new Error(
          'Concurrent modification detected. Some commissions were already processed.'
        );
      }

      return { payoutId: payout.id, amountEgp: totalAmount };
    });

    return NextResponse.json({
      success: true,
      payoutId: result.payoutId,
      amountEgp: result.amountEgp,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Payout creation failed.' },
      { status: 400 }
    );
  }
}
