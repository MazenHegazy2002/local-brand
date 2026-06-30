// src/lib/checkout-affiliate.ts
// Drop-in helpers for the existing order creation flow

import { prisma } from '@/lib/prisma';
import {
  validatePromoCode,
  createPendingCommission,
  activateReferralBonuses,
  confirmCommission as _confirmCommission,
  cancelCommission as _cancelCommission,
} from '@/lib/affiliate';

/**
 * STEP 1 — Call during checkout BEFORE creating the order.
 * Returns the final total after any promo discount.
 */
export async function applyPromoToCheckout(params: {
  promoCode: string | null;
  orderTotalEgp: number;
  buyerId: string | null;
}): Promise<{
  finalTotalEgp: number;
  discountAmountEgp: number;
  affiliateId: string | null;
  discountPct: number;
}> {
  const { promoCode, orderTotalEgp, buyerId } = params;

  if (!promoCode) {
    return {
      finalTotalEgp: orderTotalEgp,
      discountAmountEgp: 0,
      affiliateId: null,
      discountPct: 0,
    };
  }

  const result = await validatePromoCode(promoCode, orderTotalEgp, buyerId || '');
  if (!result.valid) {
    return {
      finalTotalEgp: orderTotalEgp,
      discountAmountEgp: 0,
      affiliateId: null,
      discountPct: 0,
    };
  }

  return {
    finalTotalEgp: parseFloat((orderTotalEgp - result.discountAmountEgp).toFixed(2)),
    discountAmountEgp: result.discountAmountEgp,
    affiliateId: result.affiliateId,
    discountPct: result.discountPct,
  };
}

/**
 * STEP 2 — Call immediately AFTER creating the Order record in DB.
 * Records the promo usage and creates a pending commission.
 */
export async function recordAffiliateSale(params: {
  orderId: string;
  affiliateId: string;
  buyerId: string | null;
  orderTotalBeforeDiscountEgp: number;
  orderTotalAfterDiscountEgp: number;
  discountPct: number;
  discountAmountEgp: number;
}) {
  const {
    orderId,
    affiliateId,
    buyerId,
    orderTotalBeforeDiscountEgp,
    orderTotalAfterDiscountEgp,
    discountPct,
    discountAmountEgp,
  } = params;

  await prisma.promoCodeUsage.create({
    data: {
      affiliateId,
      orderId,
      buyerId: buyerId || null,
      discountPct,
      discountAmountEgp,
      orderTotalBeforeDiscount: orderTotalBeforeDiscountEgp,
      orderTotalAfterDiscount: orderTotalAfterDiscountEgp,
    },
  });

  const commission = await createPendingCommission(
    orderId,
    affiliateId,
    orderTotalAfterDiscountEgp
  );

  await prisma.affiliate.update({
    where: { id: affiliateId },
    data: { pendingEarningsEgp: { increment: commission.commissionEgp } },
  });

  // Activate referral bonuses on buyer's first order
  const buyerAffiliate = buyerId
    ? await prisma.affiliate.findUnique({ where: { userId: buyerId } })
    : null;
  if (buyerAffiliate) {
    await activateReferralBonuses(buyerAffiliate.id, orderId);
  }

  return commission;
}

/**
 * STEP 3 — Call when order status changes to DELIVERED.
 * Confirms the commission so it becomes payable.
 */
export { confirmCommission } from '@/lib/affiliate';

/**
 * STEP 4 — Call when an order is RETURNED or CANCELLED.
 * Reverses the commission.
 */
export { cancelCommission } from '@/lib/affiliate';
