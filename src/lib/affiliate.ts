// src/lib/affiliate.ts
// Core business logic for the affiliate system

import { prisma } from '@/lib/prisma';
import {
  AffiliateTier,
  AffiliateCommissionStatus,
  AffiliateBonusStatus,
  AffiliateBonusType,
} from '@/generated/client';

// ─── Tier helpers ─────────────────────────────────────────────────────────────

export async function getTierConfig() {
  return prisma.affiliateTierConfig.findMany({ orderBy: { minConversions: 'asc' } });
}

export async function getTierForConversions(conversions: number): Promise<AffiliateTier> {
  const tiers = await getTierConfig();
  let result: AffiliateTier = AffiliateTier.STARTER;
  for (const t of tiers) {
    if (conversions >= t.minConversions) result = t.tier;
  }
  return result;
}

export async function getCommissionRate(affiliateId: string): Promise<number> {
  const affiliate = await prisma.affiliate.findUniqueOrThrow({
    where: { id: affiliateId },
  });

  if (affiliate.customCommissionPct !== null) {
    return Number(affiliate.customCommissionPct);
  }

  const tierConfigs = await getTierConfig();
  const config = tierConfigs.find(t => t.tier === affiliate.tier);
  return config ? Number(config.commissionPct) : 5;
}

export async function getDiscountRate(affiliateId: string): Promise<number> {
  const [affiliate, settings] = await Promise.all([
    prisma.affiliate.findUniqueOrThrow({ where: { id: affiliateId } }),
    getGlobalSettings(),
  ]);

  if (affiliate.customDiscountPct !== null) {
    const custom = Number(affiliate.customDiscountPct);
    const max = Number(settings.maxDiscountPct);
    return Math.min(custom, max);
  }

  return Number(settings.defaultDiscountPct);
}

// ─── Global settings ──────────────────────────────────────────────────────────

export async function getGlobalSettings() {
  const settings = await prisma.affiliateGlobalSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      defaultDiscountPct: 15,
      maxDiscountPct: 30,
      referrerBonusEgp: 50,
      joinerBonusEgp: 30,
      bonusExpiryDays: 90,
      bonusesEnabled: true,
      programEnabled: true,
    },
  });
  return settings;
}

// ─── Promo code validation ────────────────────────────────────────────────────

export type PromoValidationResult =
  | { valid: true; affiliateId: string; discountPct: number; discountAmountEgp: number }
  | { valid: false; reason: string };

export async function validatePromoCode(
  code: string,
  orderTotalEgp: number,
  buyerId: string
): Promise<PromoValidationResult> {
  const settings = await getGlobalSettings();

  if (!settings.programEnabled) {
    return { valid: false, reason: 'Affiliate program is currently disabled.' };
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { promoCode: code.toUpperCase() },
  });

  if (!affiliate) return { valid: false, reason: 'Invalid promo code.' };
  if (affiliate.status !== 'ACTIVE')
    return { valid: false, reason: 'This promo code is no longer active.' };

  if (affiliate.userId === buyerId) {
    return { valid: false, reason: 'You cannot use your own promo code.' };
  }

  const alreadyUsed = await prisma.promoCodeUsage.findFirst({
    where: { affiliateId: affiliate.id, buyerId },
  });
  if (alreadyUsed) {
    return { valid: false, reason: 'You have already used this promo code.' };
  }

  const discountPct = await getDiscountRate(affiliate.id);
  const discountAmountEgp = parseFloat(((orderTotalEgp * discountPct) / 100).toFixed(2));

  return {
    valid: true,
    affiliateId: affiliate.id,
    discountPct,
    discountAmountEgp,
  };
}

// ─── Commission creation ──────────────────────────────────────────────────────

export async function createPendingCommission(
  orderId: string,
  affiliateId: string,
  orderTotalEgp: number
) {
  const commissionPct = await getCommissionRate(affiliateId);
  const commissionEgp = parseFloat(((orderTotalEgp * commissionPct) / 100).toFixed(2));

  return prisma.commission.create({
    data: {
      affiliateId,
      orderId,
      orderTotalEgp,
      commissionPct,
      commissionEgp,
      status: AffiliateCommissionStatus.PENDING,
    },
  });
}

// ─── Commission confirmation ──────────────────────────────────────────────────

export async function confirmCommission(orderId: string) {
  const commission = await prisma.commission.findFirst({
    where: { orderId, status: AffiliateCommissionStatus.PENDING },
  });
  if (!commission) return null;

  const [updated] = await prisma.$transaction([
    prisma.commission.update({
      where: { id: commission.id },
      data: { status: AffiliateCommissionStatus.CONFIRMED, confirmedAt: new Date() },
    }),
    prisma.affiliate.update({
      where: { id: commission.affiliateId },
      data: {
        totalConversions: { increment: 1 },
        totalEarnedEgp: { increment: commission.commissionEgp },
        pendingEarningsEgp: { decrement: commission.commissionEgp },
      },
    }),
  ]);

  await maybeUpgradeTier(commission.affiliateId);

  return updated;
}

// ─── Commission cancellation ──────────────────────────────────────────────────

export async function cancelCommission(orderId: string) {
  const commission = await prisma.commission.findFirst({
    where: {
      orderId,
      status: { in: [AffiliateCommissionStatus.PENDING, AffiliateCommissionStatus.CONFIRMED] },
    },
  });
  if (!commission) return null;

  return prisma.$transaction([
    prisma.commission.update({
      where: { id: commission.id },
      data: { status: AffiliateCommissionStatus.CANCELLED },
    }),
    prisma.affiliate.update({
      where: { id: commission.affiliateId },
      data:
        commission.status === AffiliateCommissionStatus.CONFIRMED
          ? {
              totalConversions: { decrement: 1 },
              totalEarnedEgp: { decrement: commission.commissionEgp },
            }
          : {
              pendingEarningsEgp: { decrement: commission.commissionEgp },
            },
    }),
  ]);
}

// ─── Referral signup bonuses ──────────────────────────────────────────────────

export async function processReferralSignup(newAffiliateId: string, referralSlug: string) {
  const settings = await getGlobalSettings();
  if (!settings.bonusesEnabled) return null;

  const referrer = await prisma.affiliate.findUnique({
    where: { referralSlug: referralSlug.toUpperCase() },
  });
  if (!referrer || referrer.status !== 'ACTIVE') return null;
  if (referrer.id === newAffiliateId) return null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + settings.bonusExpiryDays);

  const [referrerBonus, joinerBonus, referral] = await prisma.$transaction([
    prisma.affiliateBonus.create({
      data: {
        affiliateId: referrer.id,
        type: AffiliateBonusType.REFERRER_SIGNUP,
        amountEgp: settings.referrerBonusEgp,
        status: AffiliateBonusStatus.PENDING,
        expiresAt,
      },
    }),
    prisma.affiliateBonus.create({
      data: {
        affiliateId: newAffiliateId,
        type: AffiliateBonusType.JOINER_SIGNUP,
        amountEgp: settings.joinerBonusEgp,
        status: AffiliateBonusStatus.PENDING,
        expiresAt,
      },
    }),
    prisma.affiliateReferral.create({
      data: {
        referrerAffiliateId: referrer.id,
        newAffiliateId,
      },
    }),
  ]);

  await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: { referrerBonusId: referrerBonus.id, joinerBonusId: joinerBonus.id },
  });

  return { referrerBonus, joinerBonus, referral };
}

export async function activateReferralBonuses(affiliateId: string, orderId: string) {
  const referral = await prisma.affiliateReferral.findUnique({
    where: { newAffiliateId: affiliateId },
    include: { referrerBonus: true, joinerBonus: true },
  });

  if (!referral || referral.firstOrderTriggered) return null;

  const now = new Date();

  await prisma.$transaction([
    prisma.affiliateReferral.update({
      where: { id: referral.id },
      data: { firstOrderTriggered: true, firstOrderId: orderId },
    }),
    ...(referral.referrerBonusId
      ? [
          prisma.affiliateBonus.update({
            where: { id: referral.referrerBonusId },
            data: { status: AffiliateBonusStatus.ACTIVE, activatedAt: now },
          }),
        ]
      : []),
    ...(referral.joinerBonusId
      ? [
          prisma.affiliateBonus.update({
            where: { id: referral.joinerBonusId },
            data: { status: AffiliateBonusStatus.ACTIVE, activatedAt: now },
          }),
        ]
      : []),
  ]);

  return referral;
}

// ─── Tier auto-upgrade ────────────────────────────────────────────────────────

async function maybeUpgradeTier(affiliateId: string) {
  const affiliate = await prisma.affiliate.findUniqueOrThrow({
    where: { id: affiliateId },
  });

  const newTier = await getTierForConversions(affiliate.totalConversions);

  if (newTier !== affiliate.tier) {
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: { tier: newTier },
    });
  }
}

// ─── Promo code generator ─────────────────────────────────────────────────────

export function generatePromoCode(name: string, discountPct: number): string {
  const base = name
    .split(' ')[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8);
  return `${base}${discountPct}`;
}

export async function isPromoCodeAvailable(code: string): Promise<boolean> {
  const existing = await prisma.affiliate.findUnique({
    where: { promoCode: code.toUpperCase() },
  });
  return !existing;
}

// ─── Seed tier configs (run once after migration) ─────────────────────────────

export async function seedAffiliateTiers() {
  const tiers = [
    { tier: AffiliateTier.STARTER, name: 'Starter', minConversions: 0, commissionPct: 5 },
    { tier: AffiliateTier.SILVER, name: 'Silver', minConversions: 20, commissionPct: 6 },
    { tier: AffiliateTier.GOLD, name: 'Gold', minConversions: 84, commissionPct: 8 },
    { tier: AffiliateTier.PLATINUM, name: 'Platinum', minConversions: 200, commissionPct: 12 },
  ];

  for (const t of tiers) {
    await prisma.affiliateTierConfig.upsert({
      where: { tier: t.tier },
      update: { name: t.name, minConversions: t.minConversions, commissionPct: t.commissionPct },
      create: t,
    });
  }
}
