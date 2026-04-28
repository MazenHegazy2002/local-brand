'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Loyalty points: 1 point per 10 EGP spent
const POINTS_RATIO = 10;

export async function addLoyaltyPoints(userId: string, amountSpent: number) {
  const points = Math.floor(amountSpent / POINTS_RATIO);
  
  await prisma.user.update({
    where: { id: userId },
    data: { loyaltyPoints: { increment: points } }
  });

  return { points, totalPoints: await getUserPoints(userId) };
}

export async function getUserPoints(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true }
  });
  return user?.loyaltyPoints || 0;
}

export async function redeemLoyaltyPoints(userId: string, pointsToRedeem: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.id !== userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true }
  });

  if (!user || user.loyaltyPoints < pointsToRedeem) {
    throw new Error("Insufficient points");
  }

  // 1 point = 1 EGP
  const discountAmount = pointsToRedeem;

  await prisma.user.update({
    where: { id: userId },
    data: { loyaltyPoints: { decrement: pointsToRedeem } }
  });

  revalidatePath('/dashboard');
  return { success: true, discountAmount, remainingPoints: user.loyaltyPoints - pointsToRedeem };
}

export async function getLoyaltyHistory(userId: string) {
  // For now, return current points (in a real app, you'd have a history table)
  const points = await getUserPoints(userId);
  return {
    currentPoints: points,
    pointsValue: points, // 1 point = 1 EGP
    history: [] // Would need a LoyaltyTransaction model for full history
  };
}
