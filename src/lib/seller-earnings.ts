import { prisma } from '@/lib/prisma';
import { OrderItemStatus, OrderStatus, PayoutStatus } from '@/generated/client';

// Single source of truth for seller earnings. Replaces the old
// `sellerProfile.balance` column which was incremented eagerly on order
// DELIVERED and could drift (admin force-status, manual edits, partial
// returns, etc.). Everything is now computed on the fly from delivered
// order items minus payouts already in flight.
export const ESCROW_DAYS = 14;
const ESCROW_MS = ESCROW_DAYS * 24 * 60 * 60 * 1000;

export interface SellerEarnings {
  available: number;
  held: number;
  totalEarned: number;
  totalPaidOut: number;
  commissionRate: number;
  // Earliest deliveredAt among items still in escrow — useful for telling
  // the seller "your next batch clears on <date>".
  nextReleaseAt: Date | null;
}

const ITEM_EARNING_STATUSES: OrderItemStatus[] = [OrderItemStatus.DELIVERED];

const PAYOUT_OUTSTANDING_STATUSES: PayoutStatus[] = [
  PayoutStatus.PENDING,
  PayoutStatus.PROCESSING,
  PayoutStatus.PAID,
];

export async function computeSellerEarnings(sellerId: string): Promise<SellerEarnings> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { commissionRate: true },
  });
  if (!seller) {
    return {
      available: 0,
      held: 0,
      totalEarned: 0,
      totalPaidOut: 0,
      commissionRate: 0.15,
      nextReleaseAt: null,
    };
  }

  // Pull every "earned" line item (delivered + parent order is delivered +
  // not refunded/returned/cancelled). We compute escrow per item rather
  // than per order so partial returns/refunds shrink the seller's share
  // correctly.
  const eligibleItems = await prisma.orderItem.findMany({
    where: {
      variant: { product: { sellerId } },
      status: { in: ITEM_EARNING_STATUSES },
      order: { status: OrderStatus.DELIVERED },
    },
    select: {
      priceAtPurchase: true,
      quantity: true,
      order: { select: { deliveredAt: true, updatedAt: true } },
    },
  });

  const cutoff = new Date(Date.now() - ESCROW_MS);

  let availableGross = 0;
  let held = 0;
  let nextReleaseAt: Date | null = null;

  for (const item of eligibleItems) {
    const gross = item.priceAtPurchase * item.quantity;
    const net = gross * (1 - seller.commissionRate);
    // Prefer the explicit deliveredAt; fall back to updatedAt for orders
    // that were delivered before deliveredAt was added to the schema.
    const delivered = item.order.deliveredAt ?? item.order.updatedAt;
    if (delivered <= cutoff) {
      availableGross += net;
    } else {
      held += net;
      const releaseAt = new Date(delivered.getTime() + ESCROW_MS);
      if (!nextReleaseAt || releaseAt < nextReleaseAt) nextReleaseAt = releaseAt;
    }
  }

  // Subtract any payouts already requested or paid. CANCELLED payouts are
  // ignored — the seller can request that money again.
  const payoutAgg = await prisma.payout.aggregate({
    where: { sellerId, status: { in: PAYOUT_OUTSTANDING_STATUSES } },
    _sum: { amount: true },
  });
  const totalPaidOut = payoutAgg._sum.amount ?? 0;

  const available = Math.max(0, availableGross - totalPaidOut);

  return {
    available: round(available),
    held: round(held),
    totalEarned: round(availableGross + held),
    totalPaidOut: round(totalPaidOut),
    commissionRate: seller.commissionRate,
    nextReleaseAt,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
