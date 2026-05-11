'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { SessionUser } from '@/types';
import { POINTS_PER_ORDER, POINT_VALUE_EGP } from '@/lib/loyalty-constants';

// ============================================================
// Loyalty rules
// 1) Each successful order earns the buyer +10 points (flat).
// 2) 1 point = 1 EGP discount at checkout (redeem only what you own).
// 3) When points are redeemed, the user's balance decreases.
// Constants live in src/lib/loyalty-constants.ts so this file can stay
// "use server"-only.
// ============================================================

/**
 * Award the flat per-order bonus to a user. Called once after a successful
 * checkout. We do NOT award based on amount spent — every paid order
 * gives exactly +POINTS_PER_ORDER points.
 */
export async function addLoyaltyPoints(userId: string, _amountSpent: number = 0) {
  void _amountSpent;
  const points = POINTS_PER_ORDER;

  await prisma.user.update({
    where: { id: userId },
    data: { loyaltyPoints: { increment: points } },
  });

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
 * Spend (redeem) points. Used during checkout. Throws if the user does not
 * own enough points or if the caller is impersonating a different user.
 * On success, the user's balance is decremented atomically.
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
  const result = await prisma.user.updateMany({
    where: { id: userId, loyaltyPoints: { gte: pointsToRedeem } },
    data: { loyaltyPoints: { decrement: pointsToRedeem } },
  });

  if (result.count === 0) {
    throw new Error('Insufficient points');
  }

  const discountAmount = pointsToRedeem * POINT_VALUE_EGP;
  const remainingPoints = await getUserPoints(userId);

  revalidatePath('/dashboard');
  return { success: true, discountAmount, remainingPoints };
}

/**
 * Refund points to a user (e.g. when an order is cancelled and points
 * had been redeemed during checkout). Increments only — never goes
 * negative.
 */
export async function refundLoyaltyPoints(userId: string, points: number) {
  if (!points || points <= 0) return { success: true };
  await prisma.user.update({
    where: { id: userId },
    data: { loyaltyPoints: { increment: points } },
  });
  return { success: true };
}

export async function getLoyaltyHistory(userId: string) {
  const points = await getUserPoints(userId);
  return {
    currentPoints: points,
    pointsValue: points * POINT_VALUE_EGP,
    history: [], // Reserved for a future LoyaltyTransaction model
  };
}
