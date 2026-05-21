// src/app/api/affiliate/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePromoCode, isPromoCodeAvailable, getGlobalSettings } from '@/lib/affiliate';
import { z } from 'zod';
import { AffiliatePayoutMethod } from '@/generated/client';

const ApplySchema = z.object({
  requestedCode: z
    .string()
    .min(3)
    .max(16)
    .regex(/^[A-Z0-9]+$/, 'Code must be letters and numbers only')
    .optional(),
  platform: z.string().min(2, 'Platform name is required'),
  platformFollowers: z.number().int().nonnegative().optional(),
  categoryFocus: z.string().optional(),
  applicationNote: z.string().optional(),
  payoutMethod: z.string(),
  payoutDetails: z.string().min(5, 'Valid payout details required'),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'You already have an affiliate profile or active application.' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    requestedCode,
    platform,
    platformFollowers,
    categoryFocus,
    applicationNote,
    payoutMethod,
    payoutDetails,
  } = parsed.data;

  const settings = await getGlobalSettings();
  if (!settings.programEnabled) {
    return NextResponse.json(
      { error: 'The affiliate program is currently disabled.' },
      { status: 400 }
    );
  }

  let candidateCode = '';
  if (requestedCode) {
    const clean = requestedCode.toUpperCase();
    const available = await isPromoCodeAvailable(clean);
    if (!available) {
      return NextResponse.json(
        { error: 'Requested promo code is already taken.' },
        { status: 400 }
      );
    }
    candidateCode = clean;
  } else {
    candidateCode = generatePromoCode(
      session.user.name || 'USER',
      Number(settings.defaultDiscountPct)
    );
  }

  const affiliate = await prisma.affiliate.create({
    data: {
      userId: session.user.id,
      promoCode: candidateCode,
      referralSlug: candidateCode,
      status: 'PENDING',
      tier: 'STARTER',
      platform,
      platformFollowers,
      categoryFocus,
      applicationNote,
      payoutMethod: payoutMethod as AffiliatePayoutMethod,
      payoutDetails,
    },
  });

  return NextResponse.json(
    { success: true, affiliateId: affiliate.id, promoCode: affiliate.promoCode },
    { status: 201 }
  );
}
