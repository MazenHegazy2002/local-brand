/**
 * @jest-environment node
 *
 * Verifies the seller-earnings helper — the single source of truth for
 * seller payouts. The previous balance column on SellerProfile is now
 * vestigial; everything (dashboard, payout request, admin sellers view)
 * derives its numbers from here, so this needs to be right.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// `tests/setup.ts` already mocks @/lib/prisma globally with the full union
// of every model/method the project uses. We grab loosely typed handles to
// the jest.fn() stubs we care about — using a `MockFn` alias rather than
// jest.Mock so the call sites don't have to fight the strict `never`
// inference @jest/globals applies to its default Mock type.
import { prisma } from '@/lib/prisma';
import { computeSellerEarnings, ESCROW_DAYS } from '@/lib/seller-earnings';

type MockFn = jest.Mock<any>;

const mockedPrisma = prisma as unknown as {
  sellerProfile: { findUnique: MockFn };
  orderItem: { findMany: MockFn };
  payout: { aggregate: MockFn };
};

const SELLER_ID = 'seller-1';
const ESCROW_MS = ESCROW_DAYS * 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('computeSellerEarnings', () => {
  it('returns the EMPTY_EARNINGS shape when the seller does not exist', async () => {
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue(null);

    const result = await computeSellerEarnings('does-not-exist');

    expect(result.available).toBe(0);
    expect(result.held).toBe(0);
    expect(result.totalEarned).toBe(0);
    expect(result.totalPaidOut).toBe(0);
    expect(result.nextReleaseAt).toBeNull();
    expect(mockedPrisma.sellerProfile.findUnique).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.orderItem.findMany).not.toHaveBeenCalled();
    expect(mockedPrisma.payout.aggregate).not.toHaveBeenCalled();
  });

  it('returns zeros when the seller has no delivered items', async () => {
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.15 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await computeSellerEarnings(SELLER_ID);

    expect(result.available).toBe(0);
    expect(result.held).toBe(0);
    expect(result.totalEarned).toBe(0);
    expect(result.totalPaidOut).toBe(0);
    expect(result.commissionRate).toBe(0.15);
    expect(result.nextReleaseAt).toBeNull();
  });

  it('treats items delivered more than ESCROW_DAYS ago as available', async () => {
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.15 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      {
        priceAtPurchase: 1000,
        quantity: 2,
        order: { deliveredAt: daysAgo(ESCROW_DAYS + 1), updatedAt: daysAgo(ESCROW_DAYS + 1) },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await computeSellerEarnings(SELLER_ID);

    // gross = 2000, net = 2000 * (1 - 0.15) = 1700
    expect(result.available).toBe(1700);
    expect(result.held).toBe(0);
    expect(result.totalEarned).toBe(1700);
    expect(result.nextReleaseAt).toBeNull();
  });

  it('treats items delivered within ESCROW_DAYS as held and reports nextReleaseAt', async () => {
    const deliveredAt = daysAgo(2);
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.15 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      {
        priceAtPurchase: 500,
        quantity: 4,
        order: { deliveredAt, updatedAt: deliveredAt },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await computeSellerEarnings(SELLER_ID);

    // gross = 2000, net = 2000 * (1 - 0.15) = 1700
    expect(result.available).toBe(0);
    expect(result.held).toBe(1700);
    expect(result.totalEarned).toBe(1700);
    expect(result.nextReleaseAt).not.toBeNull();
    if (result.nextReleaseAt) {
      const expectedRelease = deliveredAt.getTime() + ESCROW_MS;
      expect(result.nextReleaseAt.getTime()).toBe(expectedRelease);
    }
  });

  it('mixes available + held correctly across multiple items', async () => {
    const recentDelivery = daysAgo(3); // still in escrow
    const oldDelivery = daysAgo(ESCROW_DAYS + 5); // cleared

    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.2 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      // 1000 cleared → net 800
      {
        priceAtPurchase: 1000,
        quantity: 1,
        order: { deliveredAt: oldDelivery, updatedAt: oldDelivery },
      },
      // 250 held → net 200
      {
        priceAtPurchase: 250,
        quantity: 1,
        order: { deliveredAt: recentDelivery, updatedAt: recentDelivery },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await computeSellerEarnings(SELLER_ID);

    expect(result.available).toBe(800);
    expect(result.held).toBe(200);
    expect(result.totalEarned).toBe(1000);
    expect(result.commissionRate).toBe(0.2);
  });

  it('subtracts outstanding payouts from the available balance', async () => {
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.15 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      {
        priceAtPurchase: 1000,
        quantity: 2,
        order: { deliveredAt: daysAgo(30), updatedAt: daysAgo(30) },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 500 } });

    const result = await computeSellerEarnings(SELLER_ID);

    // gross 2000, net 1700, minus 500 paid out → 1200 available
    expect(result.available).toBe(1200);
    expect(result.held).toBe(0);
    expect(result.totalPaidOut).toBe(500);
  });

  it('clamps available to zero when payouts already exceed earnings (over-paid edge case)', async () => {
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.15 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      {
        priceAtPurchase: 100,
        quantity: 1,
        order: { deliveredAt: daysAgo(30), updatedAt: daysAgo(30) },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });

    const result = await computeSellerEarnings(SELLER_ID);

    expect(result.available).toBe(0);
  });

  it('reports the earliest in-escrow delivery as nextReleaseAt when multiple are held', async () => {
    const olderInEscrow = daysAgo(5);
    const newerInEscrow = daysAgo(1);

    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.1 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      {
        priceAtPurchase: 100,
        quantity: 1,
        order: { deliveredAt: newerInEscrow, updatedAt: newerInEscrow },
      },
      {
        priceAtPurchase: 100,
        quantity: 1,
        order: { deliveredAt: olderInEscrow, updatedAt: olderInEscrow },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await computeSellerEarnings(SELLER_ID);

    expect(result.nextReleaseAt).not.toBeNull();
    if (result.nextReleaseAt) {
      // The earliest of {newer + ESCROW, older + ESCROW} is older + ESCROW.
      expect(result.nextReleaseAt.getTime()).toBe(olderInEscrow.getTime() + ESCROW_MS);
    }
  });

  it('falls back to updatedAt when deliveredAt is null (legacy orders)', async () => {
    const updatedAt = daysAgo(ESCROW_DAYS + 2);
    mockedPrisma.sellerProfile.findUnique.mockResolvedValue({ commissionRate: 0.15 });
    mockedPrisma.orderItem.findMany.mockResolvedValue([
      {
        priceAtPurchase: 1000,
        quantity: 1,
        order: { deliveredAt: null, updatedAt },
      },
    ]);
    mockedPrisma.payout.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await computeSellerEarnings(SELLER_ID);

    // gross 1000, net 850 — and because updatedAt is past escrow, it's available.
    expect(result.available).toBe(850);
    expect(result.held).toBe(0);
  });

  it('swallows DB errors and returns the EMPTY_EARNINGS shape', async () => {
    mockedPrisma.sellerProfile.findUnique.mockRejectedValue(new Error('db down'));

    const result = await computeSellerEarnings(SELLER_ID);

    expect(result.available).toBe(0);
    expect(result.held).toBe(0);
    expect(result.totalEarned).toBe(0);
    expect(result.nextReleaseAt).toBeNull();
  });
});
