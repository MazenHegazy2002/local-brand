// src/app/api/admin/affiliate/payouts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AffiliatePayoutStatus } from '@/generated/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const payouts = await prisma.affiliatePayout.findMany({
    where: status ? { status: status as AffiliatePayoutStatus } : undefined,
    include: {
      affiliate: {
        include: { user: { select: { name: true, email: true } } },
      },
      commissions: { select: { id: true, commissionEgp: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    payouts: payouts.map(p => ({
      id: p.id,
      affiliateId: p.affiliateId,
      affiliateName: p.affiliate.user?.name,
      affiliateEmail: p.affiliate.user?.email,
      promoCode: p.affiliate.promoCode,
      amountEgp: Number(p.amountEgp),
      method: p.method,
      payoutDetails: p.payoutDetails,
      status: p.status,
      adminNote: p.adminNote,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
      commissionCount: p.commissions.length,
    })),
  });
}
