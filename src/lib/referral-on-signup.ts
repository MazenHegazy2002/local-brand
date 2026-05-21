// src/lib/referral-on-signup.ts
// Links the referral cookie to a new user on signup

import { prisma } from '@/lib/prisma';
import { processReferralSignup } from '@/lib/affiliate';

/**
 * Call this in your NextAuth signIn callback when isNewUser === true.
 * Reads the referral slug stored on the user record (set by /ref/[slug] cookie handler)
 * and links referral bonuses if applicable.
 */
export async function linkReferralOnSignup(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.referredBySlug) return;

  // Check if this user became an affiliate via their referral journey
  const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
  if (!affiliate) return;

  await processReferralSignup(affiliate.id, user.referredBySlug);
}

/**
 * Call this when an affiliate application is APPROVED.
 * At that point we know who referred them, so we create the referral record.
 */
export async function linkReferralOnApproval(affiliateId: string): Promise<void> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: { user: true },
  });
  if (!affiliate?.user?.referredBySlug) return;

  // Don't re-create if already linked
  const existing = await prisma.affiliateReferral.findUnique({
    where: { newAffiliateId: affiliateId },
  });
  if (existing) return;

  await processReferralSignup(affiliateId, affiliate.user.referredBySlug);
}
