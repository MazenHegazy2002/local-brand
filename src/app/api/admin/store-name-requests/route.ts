import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notification-helpers';

// Store-name change requests from sellers (SellerProfile.pendingStoreName).
// GET: the open requests. POST { sellerId, action: 'approve' | 'reject' }: apply or drop one.

async function isAdmin(req: NextRequest) {
  const role = (await getRequestUser(req))?.role;
  return role === 'ADMIN' || role === 'CO_ADMIN';
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requests = await prisma.sellerProfile.findMany({
    where: { pendingStoreName: { not: null } },
    select: {
      id: true,
      storeName: true,
      pendingStoreName: true,
      pendingStoreNameAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { pendingStoreNameAt: 'asc' },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { sellerId, action } = body as { sellerId?: string; action?: string };
  if (!sellerId || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'sellerId and action (approve | reject) are required' }, { status: 400 });
  }
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true, userId: true, storeName: true, pendingStoreName: true },
  });
  if (!seller?.pendingStoreName) return NextResponse.json({ error: 'No pending name change for this store' }, { status: 404 });

  if (action === 'approve') {
    const taken = await prisma.sellerProfile.findFirst({
      where: { storeName: { equals: seller.pendingStoreName, mode: 'insensitive' }, NOT: { id: seller.id } },
      select: { id: true },
    });
    if (taken) return NextResponse.json({ error: 'Another store already uses this name' }, { status: 409 });
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { storeName: seller.pendingStoreName, pendingStoreName: null, pendingStoreNameAt: null },
    });
    await notifyUser({
      userId: seller.userId,
      title: 'Store name approved',
      message: `Your store is now called "${seller.pendingStoreName}".`,
      link: '/seller-hub/settings',
    });
  } else {
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { pendingStoreName: null, pendingStoreNameAt: null },
    });
    await notifyUser({
      userId: seller.userId,
      title: 'Store name change declined',
      message: `Your request to rename "${seller.storeName}" to "${seller.pendingStoreName}" was declined.`,
      link: '/seller-hub/settings',
    });
  }
  return NextResponse.json({ ok: true });
}
