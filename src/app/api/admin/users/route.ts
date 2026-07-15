import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { Prisma, Role, AffiliateStatus } from '@/generated/client';

const VALID_ROLES = new Set<Role>([Role.ADMIN, Role.SELLER, Role.BUYER]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = (searchParams.get('search') || '').trim();
  const roleParam = (searchParams.get('role') || '').trim().toUpperCase();
  const role = VALID_ROLES.has(roleParam as Role) ? (roleParam as Role) : null;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(roleParam === 'AFFILIATE'
      ? { affiliate: { is: { status: AffiliateStatus.ACTIVE } } }
      : role
        ? { role }
        : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        loyaltyPoints: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        _count: { select: { orders: true } },
        affiliate: { select: { status: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}
