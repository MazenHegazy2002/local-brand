import { createHmac, timingSafeEqual } from 'crypto';

// Pure helpers for the mobile Seller Hub API (no prisma import so they are
// unit-testable).

export type SellerOrderStatus =
  | 'new'
  | 'accepted'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';
export type SellerOrderTab = 'all' | 'new' | 'to_ship' | 'shipped' | 'delivered';

export const LOW_STOCK_THRESHOLD = 5; // matches the web Seller Hub "Low stock (≤5)" filter
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Derive the seller-facing status from the order status + this seller's item statuses. */
export function deriveSellerOrderStatus(
  orderStatus: string,
  sellerItemStatuses: string[]
): SellerOrderStatus {
  if (orderStatus === 'CANCELLED') return 'cancelled';
  if (orderStatus === 'RETURNED') return 'returned';
  const live = sellerItemStatuses.filter(s => s !== 'CANCELLED');
  if (live.length === 0) return 'cancelled';
  if (orderStatus === 'DELIVERED' || live.every(s => s === 'DELIVERED')) return 'delivered';
  if (orderStatus === 'SHIPPED' || live.every(s => s === 'SHIPPED' || s === 'DELIVERED'))
    return 'shipped';
  if (live.some(s => s === 'PENDING')) return 'new';
  return 'accepted';
}

export function statusInTab(status: SellerOrderStatus, tab: SellerOrderTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'to_ship') return status === 'accepted';
  return status === tab;
}

/** Unpaid online orders aren't real orders yet (buyer abandoned the gateway). Prisma OrderWhereInput. */
export const VISIBLE_ORDER_WHERE = {
  OR: [
    { paymentMethod: 'CASH_ON_DELIVERY' as const },
    {
      paymentStatus: {
        in: ['PAID' as const, 'AUTHORIZED' as const, 'PARTIALLY_REFUNDED' as const],
      },
    },
  ],
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: 'COD',
  CREDIT_CARD: 'Card',
  PAYMOB: 'Card',
  FAWRY: 'Fawry',
  MOBILE_WALLET: 'Wallet',
  PAYSKY: 'PaySky',
};
export const paymentLabel = (m: string) => PAYMENT_LABELS[m] ?? m;

export const orderNumber = (orderId: string) => orderId.slice(0, 8).toUpperCase();

// ── Signed shipping-label URLs ────────────────────────────────────────────
export const LABEL_TTL_SECONDS = 600;

export function signLabel(orderId: string, sellerId: string, exp: number, secret: string) {
  return createHmac('sha256', secret).update(`${orderId}.${sellerId}.${exp}`).digest('hex');
}

export function verifyLabel(
  orderId: string,
  sellerId: string,
  exp: number,
  sig: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!Number.isFinite(exp) || exp < nowSec) return false;
  const expected = Buffer.from(signLabel(orderId, sellerId, exp, secret), 'hex');
  const given = Buffer.from(sig, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
