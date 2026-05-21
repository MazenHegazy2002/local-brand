// src/app/api/admin/affiliate/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGlobalSettings } from '@/lib/affiliate';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const settings = await getGlobalSettings();
  const tiers = await prisma.affiliateTierConfig.findMany({ orderBy: { minConversions: 'asc' } });

  return NextResponse.json({
    settings: {
      defaultDiscountPct: Number(settings.defaultDiscountPct),
      maxDiscountPct: Number(settings.maxDiscountPct),
      referrerBonusEgp: Number(settings.referrerBonusEgp),
      joinerBonusEgp: Number(settings.joinerBonusEgp),
      bonusExpiryDays: settings.bonusExpiryDays,
      bonusesEnabled: settings.bonusesEnabled,
      programEnabled: settings.programEnabled,
      updatedAt: settings.updatedAt,
    },
    tiers: tiers.map(t => ({
      id: t.id,
      tier: t.tier,
      name: t.name,
      minConversions: t.minConversions,
      commissionPct: Number(t.commissionPct),
      isActive: t.isActive,
    })),
  });
}

const SettingsSchema = z.object({
  defaultDiscountPct: z.number().min(0).max(100).optional(),
  maxDiscountPct: z.number().min(0).max(100).optional(),
  referrerBonusEgp: z.number().min(0).optional(),
  joinerBonusEgp: z.number().min(0).optional(),
  bonusExpiryDays: z.number().int().min(1).optional(),
  bonusesEnabled: z.boolean().optional(),
  programEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.affiliateGlobalSettings.upsert({
    where: { id: 'global' },
    update: { ...parsed.data, updatedBy: session.user.id },
    create: {
      id: 'global',
      defaultDiscountPct: 15,
      maxDiscountPct: 30,
      referrerBonusEgp: 50,
      joinerBonusEgp: 30,
      bonusExpiryDays: 90,
      bonusesEnabled: true,
      programEnabled: true,
      ...parsed.data,
      updatedBy: session.user.id,
    },
  });

  return NextResponse.json({ success: true, settings: updated });
}
