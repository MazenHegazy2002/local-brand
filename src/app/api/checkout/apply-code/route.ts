// src/app/api/checkout/apply-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validatePromoCode } from '@/lib/affiliate';
import { z } from 'zod';

const ApplyCodeSchema = z.object({
  code: z.string().min(1).max(20),
  orderTotalEgp: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'You must be logged in to apply a promo code.' },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = ApplyCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const result = await validatePromoCode(
    parsed.data.code,
    parsed.data.orderTotalEgp,
    session.user.id
  );

  if (!result.valid) {
    return NextResponse.json({ valid: false, reason: result.reason }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    discountPct: result.discountPct,
    discountAmountEgp: result.discountAmountEgp,
    finalTotalEgp: parseFloat((parsed.data.orderTotalEgp - result.discountAmountEgp).toFixed(2)),
  });
}
