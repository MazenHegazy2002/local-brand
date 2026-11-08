import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/mobile-auth';

// GET /api/admin/sellers/[id]/product-counts — active (published) and draft
// products for one seller (id = SellerProfile id).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getRequestUser(req);
  if (me?.role !== 'ADMIN' && me?.role !== 'CO_ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [active, draft] = await Promise.all([
    prisma.product.count({ where: { sellerId: id, deletedAt: null, published: true } }),
    prisma.product.count({ where: { sellerId: id, deletedAt: null, published: false } }),
  ]);
  return NextResponse.json({ active, draft });
}
