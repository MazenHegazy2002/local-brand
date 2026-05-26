'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { SessionUser } from '@/types';
import { POINTS_PER_ORDER, POINT_VALUE_EGP } from '@/lib/loyalty-constants';

// ============================================================
// Loyalty rules
// 1) Each successful order earns the buyer +10 points (flat) unless the
//    product has a custom `loyaltyPointPct` set, in which case the points
//    are calculated as a percentage of the order subtotal.
// 2) 1 point = 1 EGP discount at checkout (redeem only what you own).
// 3) When points are redeemed, the user's balance decreases.
// Constants live in src/lib/loyalty-constants.ts so this file can stay
// "use server"-only.
// ============================================================

/**
 * Award loyalty points to a user after a successful order.
 * Optionally accepts `earnedPoints` for per-product overrides (Task 8).
 * Always writes a LoyaltyTransaction record for the history ledger (Task 14).
 */
export async function addLoyaltyPoints(
  userId: string,
  _amountSpent: number = 0,
  earnedPoints?: number,
  description?: string
) {
  const points = earnedPoints ?? POINTS_PER_ORDER;
  if (points <= 0) return { points: 0, totalPoints: await getUserPoints(userId) };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        amount: points,
        type: 'EARNED_BY_ORDER',
        description: description ?? `Earned ${points} pts for order`,
      },
    }),
  ]);

  return { points, totalPoints: await getUserPoints(userId) };
}

export async function getUserPoints(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });
  return user?.loyaltyPoints || 0;
}

/**
 * Spend (redeem) points at checkout.
 * Writes a negative LoyaltyTransaction record for the history ledger.
 */
export async function redeemLoyaltyPoints(userId: string, pointsToRedeem: number) {
  if (!pointsToRedeem || pointsToRedeem <= 0) {
    return { success: true, discountAmount: 0, remainingPoints: await getUserPoints(userId) };
  }

  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).id !== userId) {
    throw new Error('Unauthorized');
  }

  // Atomic decrement that fails if balance would go negative.
  await prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({
      where: { id: userId, loyaltyPoints: { gte: pointsToRedeem } },
      data: { loyaltyPoints: { decrement: pointsToRedeem } },
    });
    if (updated.count === 0) throw new Error('Insufficient points');

    await tx.loyaltyTransaction.create({
      data: {
        userId,
        amount: -pointsToRedeem,
        type: 'REDEEMED_AT_CHECKOUT',
        description: `Redeemed ${pointsToRedeem} pts at checkout`,
      },
    });
  });

  const discountAmount = pointsToRedeem * POINT_VALUE_EGP;
  const remainingPoints = await getUserPoints(userId);

  revalidatePath('/dashboard');
  return { success: true, discountAmount, remainingPoints };
}

/**
 * Refund points to a user (e.g. when an order is cancelled and points
 * had been redeemed during checkout). Writes a REFUNDED transaction record.
 */
export async function refundLoyaltyPoints(userId: string, points: number) {
  if (!points || points <= 0) return { success: true };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        amount: points,
        type: 'REFUNDED',
        description: `Refunded ${points} pts (order cancellation)`,
      },
    }),
  ]);

  return { success: true };
}

/**
 * Award loyalty points for a verified review submission (Task 24).
 * Uses a separate EARNED_BY_REVIEW transaction type.
 */
export async function addReviewLoyaltyPoints(
  userId: string,
  points: number,
  productTitle?: string
) {
  if (!points || points <= 0) return { success: true };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        amount: points,
        type: 'EARNED_BY_REVIEW',
        description: productTitle
          ? `Earned ${points} pts for reviewing "${productTitle}"`
          : `Earned ${points} pts for review`,
      },
    }),
  ]);

  return { success: true };
}

/**
 * Fetch the loyalty transaction history for a user (Task 14).
 * Returns the running balance and a list of recent transactions.
 */
export async function getLoyaltyHistory(userId: string, limit = 50) {
  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  const currentPoints = user?.loyaltyPoints ?? 0;

  return {
    currentPoints,
    pointsValue: currentPoints * POINT_VALUE_EGP,
    history: transactions,
  };
}
