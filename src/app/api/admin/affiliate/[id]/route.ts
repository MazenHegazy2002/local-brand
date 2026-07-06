// src/app/api/admin/affiliate/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { linkReferralOnApproval } from '@/lib/referral-on-signup';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return null;
  return session;
}

const UpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'BANNED', 'REJECTED']).optional(),
  customCommissionPct: z.number().min(0).max(100).nullable().optional(),
  customDiscountPct: z.number().min(0).max(100).nullable().optional(),
  adminNote: z.string().max(500).optional(),
  promoCode: z
    .string()
    .min(3)
    .max(16)
    .regex(/^[A-Z0-9]+$/)
    .optional(),
  tier: z.enum(['STARTER', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  type: z.string().optional(),
  level: z.number().int().min(1).max(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    status,
    customCommissionPct,
    customDiscountPct,
    adminNote,
    promoCode,
    tier,
    type,
    level,
  } = parsed.data;

  // If approving, set approvedAt
  const wasApproved = status === 'ACTIVE';
  const currentAffiliate = await prisma.affiliate.findUnique({ where: { id } });
  const isBeingApproved = wasApproved && currentAffiliate?.status !== 'ACTIVE';

  const updated = await prisma.affiliate.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(customCommissionPct !== undefined ? { customCommissionPct } : {}),
      ...(customDiscountPct !== undefined ? { customDiscountPct } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
      ...(promoCode !== undefined ? { promoCode, referralSlug: promoCode } : {}),
      ...(tier !== undefined ? { tier } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(isBeingApproved ? { approvedAt: new Date(), approvedBy: session.user.id } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
  });

  // Link referral bonuses when approved
  if (isBeingApproved) {
    await linkReferralOnApproval(id);

    // Auto-verify email
    await prisma.user.update({
      where: { id: updated.userId },
      data: { emailVerified: new Date() },
    });

    // Send confirmation email
    try {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: updated.user.email,
        subject: 'Your Brandy affiliate account has been approved! 🎉',
        html: `<p>Hi ${updated.user.name || 'Partner'},</p><p>Congratulations! Your application to the Brandy Affiliate Program has been approved. You are now officially a Brandy partner!</p><p><strong>Your Promo Code:</strong> ${updated.promoCode}<br/><strong>Your Referral Link:</strong> ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ref/${updated.promoCode}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/affiliate/dashboard">Go to Affiliate Dashboard</a></p>`,
      });
    } catch (emailErr) {
      console.error('[affiliate approval] Failed to send email:', emailErr);
    }
  }

  return NextResponse.json({ success: true, affiliate: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;

  await prisma.affiliate.update({
    where: { id },
    data: { status: 'BANNED' },
  });

  return NextResponse.json({ success: true });
}
