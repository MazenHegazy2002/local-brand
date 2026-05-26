import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { computeSellerEarnings } from '@/lib/seller-earnings';

/**
 * GET /api/admin/payouts/escrow
 *
 * Returns per-seller escrow breakdown for the Admin-OS Payouts tab.
 * Each entry shows: storeName, held (EGP in escrow), available (EGP mature),
 * and nextReleaseAt (ISO string of when the next escrow batch clears).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if ((session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const sellers = await prisma.sellerProfile.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, storeName: true },
    orderBy: { storeName: 'asc' },
  });

  const rows = await Promise.all(
    sellers.map(async s => {
      const earnings = await computeSellerEarnings(s.id);
      return {
        sellerId: s.id,
        storeName: s.storeName,
        held: earnings.held,
        available: earnings.available,
        nextReleaseAt: earnings.nextReleaseAt?.toISOString() ?? null,
      };
    })
  );

  // Only include sellers who actually have funds (held OR available > 0)
  const active = rows.filter(r => r.held > 0 || r.available > 0);

  return NextResponse.json({ escrow: active });
}
