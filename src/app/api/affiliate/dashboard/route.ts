// src/app/api/affiliate/dashboard/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTierConfig, getGlobalSettings } from '@/lib/affiliate';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
    include: {
      commissions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { order: { select: { id: true, createdAt: true } } },
      },
      affiliatePayouts: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      bonuses: {
        where: { status: { in: ['PENDING', 'ACTIVE'] } },
      },
    },
  });

  if (!affiliate) {
    return NextResponse.json({ error: 'No affiliate account found.' }, { status: 404 });
  }

  const [tiers, settings] = await Promise.all([getTierConfig(), getGlobalSettings()]);

  // Calculate progress to next tier
  const currentTierIdx = tiers.findIndex(t => t.tier === affiliate.tier);
  const nextTier = tiers[currentTierIdx + 1] ?? null;
  const currentTierMin = tiers[currentTierIdx]?.minConversions ?? 0;
  const nextTierMin = nextTier?.minConversions ?? null;

  const progress =
    nextTierMin !== null
      ? Math.min(
          100,
          Math.round(
            ((affiliate.totalConversions - currentTierMin) / (nextTierMin - currentTierMin)) * 100
          )
        )
      : 100;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return NextResponse.json({
    affiliate: {
      id: affiliate.id,
      promoCode: affiliate.promoCode,
      referralLink: `${appUrl}/ref/${affiliate.referralSlug}`,
      status: affiliate.status,
      tier: affiliate.tier,
      tierName: tiers.find(t => t.tier === affiliate.tier)?.name ?? affiliate.tier,
      commissionPct: affiliate.customCommissionPct
        ? Number(affiliate.customCommissionPct)
        : Number(tiers.find(t => t.tier === affiliate.tier)?.commissionPct ?? 5),
      discountPct: affiliate.customDiscountPct
        ? Number(affiliate.customDiscountPct)
        : Number(settings.defaultDiscountPct),
      totalEarnedEgp: Number(affiliate.totalEarnedEgp),
      pendingEarningsEgp: Number(affiliate.pendingEarningsEgp),
      totalConversions: affiliate.totalConversions,
      createdAt: affiliate.createdAt,
    },
    tiers,
    nextTier,
    progress,
    settings: {
      referrerBonusEgp: Number(settings.referrerBonusEgp),
      joinerBonusEgp: Number(settings.joinerBonusEgp),
      bonusesEnabled: settings.bonusesEnabled,
    },
    recentCommissions: affiliate.commissions.map(c => ({
      id: c.id,
      orderId: c.orderId,
      orderCreatedAt: c.order?.createdAt,
      orderTotalEgp: Number(c.orderTotalEgp),
      commissionPct: Number(c.commissionPct),
      commissionEgp: Number(c.commissionEgp),
      status: c.status,
      confirmedAt: c.confirmedAt,
    })),
    payouts: affiliate.affiliatePayouts,
    bonuses: affiliate.bonuses.map(b => ({
      id: b.id,
      type: b.type,
      amountEgp: Number(b.amountEgp),
      status: b.status,
      expiresAt: b.expiresAt,
    })),
  });
}
