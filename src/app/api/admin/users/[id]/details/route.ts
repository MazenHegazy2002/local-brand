import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/mobile-auth';

// GET /api/admin/users/[id]/details — everything an admin needs to see about
// one account: profile, addresses, orders, and affiliate / seller info.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getRequestUser(req);
  if (me?.role !== 'ADMIN' && me?.role !== 'CO_ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      loyaltyPoints: true,
      emailVerified: true,
      createdAt: true,
      deletedAt: true,
      referredBySlug: true,
      addresses: {
        select: { id: true, street: true, city: true, governorate: true, country: true },
      },
      sellerProfile: {
        select: { id: true, storeName: true, status: true, governorate: true, city: true },
      },
      affiliate: {
        select: {
          id: true,
          promoCode: true,
          referralSlug: true,
          status: true,
          tier: true,
          type: true,
          level: true,
          customCommissionPct: true,
          customDiscountPct: true,
          platform: true,
          platformFollowers: true,
          categoryFocus: true,
          applicationNote: true,
          adminNote: true,
          approvedAt: true,
          payoutMethod: true,
          payoutDetails: true,
          totalConversions: true,
          totalEarnedEgp: true,
          pendingEarningsEgp: true,
          createdAt: true,
          commissions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              orderId: true,
              orderTotalEgp: true,
              commissionEgp: true,
              status: true,
              createdAt: true,
            },
          },
          _count: { select: { commissions: true, referralsMade: true, promoUsages: true } },
        },
      },
      _count: { select: { orders: true, reviews: true, wishlist: true } },
    },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  // Co-admins cannot see payout details of an affiliate.
  if (me.role !== 'ADMIN' && user.affiliate) user.affiliate.payoutDetails = null;

  const [orders, spent, referred] = await Promise.all([
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.aggregate({
      where: { userId: id, status: { notIn: ['CANCELLED', 'RETURNED'] } },
      _sum: { totalAmount: true },
    }),
    user.affiliate
      ? prisma.user.count({ where: { referredBySlug: user.affiliate.referralSlug } })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({
    user: JSON.parse(JSON.stringify(user)),
    orders,
    totalSpent: spent._sum.totalAmount ?? 0,
    referredUsers: referred,
  });
}
