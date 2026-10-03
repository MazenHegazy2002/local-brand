import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { computeSellerEarnings } from '@/lib/seller-earnings';

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const earnings = await computeSellerEarnings(seller.id);

  return NextResponse.json({
    available: earnings.available,
    held: earnings.held,
    paid: earnings.totalPaidOut,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
