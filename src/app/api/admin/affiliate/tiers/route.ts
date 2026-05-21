// src/app/api/admin/affiliate/tiers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return null;
  return session;
}

const TiersSchema = z.array(
  z.object({
    tier: z.enum(['STARTER', 'SILVER', 'GOLD', 'PLATINUM']),
    name: z.string().min(1).max(50),
    minConversions: z.number().int().min(0),
    commissionPct: z.number().min(0).max(100),
    isActive: z.boolean().optional().default(true),
  })
);

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const parsed = TiersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates = await Promise.all(
    parsed.data.map(t =>
      prisma.affiliateTierConfig.upsert({
        where: { tier: t.tier },
        update: {
          name: t.name,
          minConversions: t.minConversions,
          commissionPct: t.commissionPct,
          isActive: t.isActive,
        },
        create: {
          tier: t.tier,
          name: t.name,
          minConversions: t.minConversions,
          commissionPct: t.commissionPct,
          isActive: t.isActive,
        },
      })
    )
  );

  return NextResponse.json({ success: true, tiers: updates });
}
