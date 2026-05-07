// ============================================================
// BUSINESS CONSTANTS — Single source of truth
// ============================================================

export const VAT_RATE = 0.14; // Egypt VAT 14%
export const DEFAULT_COMMISSION_RATE = 0.15; // Platform takes 15%
export const RETURN_WINDOW_DAYS = 14;
export const ESCROW_HOLD_DAYS = 7;
export const LOYALTY_POINTS_PER_10EGP = 1;
export const LOYALTY_POINT_VALUE = 1; // 1 point = 1 EGP
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PRODUCT_TITLE_LENGTH = 200;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 5000;
export const MAX_REVIEW_COMMENT_LENGTH = 2000;
export const REVIEW_MIN_LENGTH = 10;
export const QA_MIN_LENGTH = 5;

// ============================================================
// SHIPPING RATES (EGP) — Governorate-based
// ============================================================
export const SHIPPING_RATES: Record<string, number> = {
  'cairo': 40,
  'giza': 40,
  'alexandria': 55,
  'aswan': 80,
  'luxor': 80,
  'portsaid': 60,
  'suez': 65,
  'ismailia': 65,
  'faiyum': 50,
  'beni suef': 50,
  'minya': 55,
  'assiut': 60,
  'sohag': 65,
  'qena': 70,
  'new valley': 90,
  'red sea': 100,
  'north sinai': 110,
  'south sinai': 120,
  'marsa matrouh': 120,
};
export const DEFAULT_SHIPPING_RATE = 75;
export const FREE_SHIPPING_THRESHOLD = 500; // Free shipping above 500 EGP
export const WEIGHT_SURCHARGE_THRESHOLD = 1000; // grams
export const WEIGHT_SURCHARGE_PER_500G = 10; // EGP per additional 500g

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
export const VALID_SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'rating', 'popular'] as const;
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGES_PER_PRODUCT = 10;

// ============================================================
// PLATFORM
// ============================================================
export const PLATFORM_NAME = 'Local Brand';
export const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://localbrand-egypt.com';
export const SUPPORT_EMAIL = 'support@localbrand.com';
export const CONTACT_PHONE = process.env.CONTACT_PHONE || '+20 123 456 789';
export const TAX_REG_NUMBER = process.env.TAX_REGISTRATION_NUMBER || 'XXX-XXX-XXX';

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export function getShippingRate(governorate: string): number {
  const key = governorate.toLowerCase().trim();
  return SHIPPING_RATES[key] ?? DEFAULT_SHIPPING_RATE;
}

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export function calculateVAT(subtotal: number): number {
  return Math.round(subtotal * VAT_RATE * 100) / 100;
}

export function calculateCommission(grossAmount: number, rate: number = DEFAULT_COMMISSION_RATE): number {
  return Math.round(grossAmount * rate * 100) / 100;
}

export function isReturnEligible(deliveredAt: Date): boolean {
  const daysSinceDelivery = Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceDelivery <= RETURN_WINDOW_DAYS;
}

export function isEscrowEligible(deliveredAt: Date): boolean {
  const daysSinceDelivery = Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceDelivery >= ESCROW_HOLD_DAYS;
}