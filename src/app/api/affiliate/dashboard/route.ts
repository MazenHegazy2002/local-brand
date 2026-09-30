// src/app/api/affiliate/dashboard/route.ts
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { getTierConfig, getGlobalSettings, getAffiliateReferralBaseUrl } from '@/lib/affiliate';

// First name + last initial only — affiliates don't get customers' full names.
function shortName(name?: string | null) {
  const [first, last] = (name ?? '').trim().split(/\s+/);
  return first ? (last ? `${first} ${last[0]}.` : first) : 'Guest';
}

// Accepts the web session cookie or the app's Bearer token.
export async function GET(req: Request) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: user.id },
    include: {
      commissions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          order: {
            select: { id: true, createdAt: true, user: { select: { name: true, role: true } } },
          },
        },
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

  const [tiers, settings, confirmed] = await Promise.all([
    getTierConfig(),
    getGlobalSettings(),
    // Same filter the payout route uses: confirmed and not yet in a payout.
    prisma.commission.aggregate({
      where: { affiliateId: affiliate.id, status: 'CONFIRMED', payoutId: null },
      _sum: { commissionEgp: true },
    }),
  ]);

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

  const appUrl = getAffiliateReferralBaseUrl();

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
      confirmedEgp: Number(confirmed._sum.commissionEgp ?? 0),
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
      usedByName: shortName(c.order?.user?.name),
      usedByRole: c.order?.user?.role ?? 'BUYER',
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
