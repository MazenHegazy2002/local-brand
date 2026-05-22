// src/app/api/admin/affiliate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AffiliateStatus, AffiliateTier } from '@/generated/client';

async function requireAdmin(_req?: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return null;
  return session;
}

// GET /api/admin/affiliate — list all affiliates with stats
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tier = searchParams.get('tier');

  const affiliates = await prisma.affiliate.findMany({
    where: {
      ...(status ? { status: status as AffiliateStatus } : {}),
      ...(tier ? { tier: tier as AffiliateTier } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      _count: { select: { commissions: true, promoUsages: true } },
    },
    orderBy: { totalEarnedEgp: 'desc' },
  });

  // Summary stats — run in parallel for performance
  const [totalActive, totalPending, commissionsAgg, revenueAgg, totalConversionsCount] =
    await Promise.all([
      prisma.affiliate.count({ where: { status: 'ACTIVE' } }),
      prisma.affiliate.count({ where: { status: 'PENDING' } }),
      prisma.commission.aggregate({
        where: { status: { in: ['CONFIRMED', 'PAID'] } },
        _sum: { commissionEgp: true },
      }),
      prisma.promoCodeUsage.aggregate({
        _sum: { orderTotalAfterDiscount: true },
      }),
      // Real-time conversion count from the PromoCodeUsage table
      prisma.promoCodeUsage.count(),
    ]);

  return NextResponse.json({
    affiliates: affiliates.map(a => ({
      id: a.id,
      promoCode: a.promoCode,
      referralSlug: a.referralSlug,
      status: a.status,
      tier: a.tier,
      customCommissionPct: a.customCommissionPct ? Number(a.customCommissionPct) : null,
      customDiscountPct: a.customDiscountPct ? Number(a.customDiscountPct) : null,
      totalConversions: a.totalConversions,
      // Source-of-truth count from PromoCodeUsage relation
      promoUsageCount: a._count.promoUsages,
      totalEarnedEgp: Number(a.totalEarnedEgp),
      pendingEarningsEgp: Number(a.pendingEarningsEgp),
      platform: a.platform,
      platformFollowers: a.platformFollowers,
      categoryFocus: a.categoryFocus,
      applicationNote: a.applicationNote,
      adminNote: a.adminNote,
      payoutMethod: a.payoutMethod,
      approvedAt: a.approvedAt,
      createdAt: a.createdAt,
      user: a.user,
    })),
    stats: {
      totalActive,
      totalPending,
      commissionsPaidEgp: Number(commissionsAgg._sum.commissionEgp ?? 0),
      revenueFromRefsEgp: Number(revenueAgg._sum.orderTotalAfterDiscount ?? 0),
      totalConversions: totalConversionsCount,
    },
  });
}
