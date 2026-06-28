// ============================================================
// BUSINESS CONSTANTS — Single source of truth
// ============================================================

export const VAT_RATE = 0.14; // Egypt VAT 14%
export const DEFAULT_COMMISSION_RATE = 0.15; // Platform takes 15%
// Hard cap: no coupon/promo can discount more than 60% of the pre-discount subtotal.
// Prevents promotional codes from being used to buy products for near-zero cost.
export const MAX_DISCOUNT_PCT = 0.6;
export const RETURN_WINDOW_DAYS = 14;
// Seller earnings are held in escrow for this many days post-delivery before
// becoming withdrawable. Keep this in lockstep with `ESCROW_DAYS` in
// `src/lib/seller-earnings.ts` — the dashboard, payout request endpoint, and
// admin views all derive `available` / `held` from that single helper.
export const ESCROW_HOLD_DAYS = 14;
export const LOYALTY_POINTS_PER_10EGP = 1;
export const LOYALTY_POINT_VALUE = 1; // 1 point = 1 EGP
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt work factor for new password hashes. 12 is the modern minimum on
// general-purpose hardware (~250ms per hash). Raising this only affects new
// hashes — existing 10-cost hashes continue to verify because the cost is
// embedded in the hash string.
export const BCRYPT_COST = 12;
export const MAX_PRODUCT_TITLE_LENGTH = 200;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 5000;
export const MAX_REVIEW_COMMENT_LENGTH = 2000;
export const REVIEW_MIN_LENGTH = 10;
export const QA_MIN_LENGTH = 5;

import { SHIPPING_RATES, DEFAULT_SHIPPING_RATE } from './shipping-rates';

// ============================================================
// PAGINATION
// ============================================================
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_BULK_UPLOAD_ITEMS = 500;
export const MAX_PRODUCT_COMPARE = 4;

// ============================================================
// CACHE TTL (seconds)
// ============================================================
export const CACHE_TTL_SHORT = 300; // 5 minutes
export const CACHE_TTL_MEDIUM = 3600; // 1 hour
export const CACHE_TTL_LONG = 86400; // 24 hours
export const CACHE_TTL_WEEK = 604800; // 7 days
export const GUEST_CART_TTL_DAYS = 7;
export const RECENTLY_VIEWED_TTL_DAYS = 30;

// ============================================================
// NOTIFICATION TYPES
// ============================================================
export const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURN_APPROVED: 'RETURN_APPROVED',
  RETURN_REJECTED: 'RETURN_REJECTED',
  PAYOUT_RECEIVED: 'PAYOUT_RECEIVED',
  REVIEW_RECEIVED: 'REVIEW_RECEIVED',
  QA_ANSWERED: 'QA_ANSWERED',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
} as const;

// ============================================================
// VALIDATION
// ============================================================
export const VALID_CONDITIONS = ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'] as const;
export const VALID_SORT_OPTIONS = [
  'newest',
  'price_asc',
  'price_desc',
  'rating',
  'popular',
] as const;
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGES_PER_PRODUCT = 10;

// ============================================================
// PLATFORM
// ============================================================
export const PLATFORM_NAME = 'Brandy';
export const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lolozozo.shop';
export const SUPPORT_EMAIL = 'support@lolozozo.shop';
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '';

// ============================================================
// PAYMENT GATEWAYS
// ============================================================
/**
 * Stripe API version used by every Stripe client constructor in the app.
 * Centralised so version bumps are a single-line change.
 */
export const STRIPE_API_VERSION = '2026-03-25.dahlia' as const;

// Tax registration number is legally required on Egyptian invoices.
// In production we warn during build but only throw at runtime when actually
// accessed — this avoids blocking the build and still fails loudly if missing
// on a live request.
const rawTaxReg = process.env.TAX_REGISTRATION_NUMBER;
if (
  process.env.NODE_ENV === 'production' &&
  !rawTaxReg &&
  // Next.js sets NEXT_PHASE during build/page data collection
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  console.warn(
    '[constants] TAX_REGISTRATION_NUMBER is not set. Invoices in production ' +
      'will display the development placeholder. Set it in your deployment env vars.'
  );
}

export const TAX_REG_NUMBER = rawTaxReg || 'XXX-XXX-XXX-DEV';

/**
 * Returns the production-grade tax registration number, throwing if it is
 * missing in production. Use this from server-only code paths that actually
 * need to render invoices.
 */
export function getTaxRegistrationNumber(): string {
  const value = process.env.TAX_REGISTRATION_NUMBER;
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'TAX_REGISTRATION_NUMBER environment variable is required in production. ' +
          'Set it in your deployment env vars before launching.'
      );
    }
    return 'XXX-XXX-XXX-DEV';
  }
  return value;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export function getShippingRate(governorate: string): number {
  const key = governorate.toLowerCase().trim();
  return SHIPPING_RATES[key] ?? DEFAULT_SHIPPING_RATE;
}

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function calculateVAT(subtotal: number): number {
  return Math.round(subtotal * VAT_RATE * 100) / 100;
}

export function calculateCommission(
  grossAmount: number,
  rate: number = DEFAULT_COMMISSION_RATE
): number {
  return Math.round(grossAmount * rate * 100) / 100;
}

export function isReturnEligible(deliveredAt: Date): boolean {
  const daysSinceDelivery = Math.floor(
    (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceDelivery <= RETURN_WINDOW_DAYS;
}

export function isEscrowEligible(deliveredAt: Date): boolean {
  const daysSinceDelivery = Math.floor(
    (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceDelivery >= ESCROW_HOLD_DAYS;
}
