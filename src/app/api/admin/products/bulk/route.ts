import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/products/bulk { ids: string[], action }
//   delete    → removes the products from the shop (soft delete, like sellers do)
//   publish   → makes them live (only those with a photo and a price)
//   unpublish → turns them back into drafts
// Admins and co-admins only.

const Body = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(['delete', 'publish', 'unpublish']),
});

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'CO_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose at least one product.' }, { status: 400 });
  }
  const { ids, action } = parsed.data;
  const where = { id: { in: ids }, deletedAt: null };

  let changed = 0;
  let skipped = 0;
  if (action === 'delete') {
    ({ count: changed } = await prisma.product.updateMany({
      where,
      data: { deletedAt: new Date(), published: false },
    }));
  } else if (action === 'unpublish') {
    ({ count: changed } = await prisma.product.updateMany({ where, data: { published: false } }));
  } else {
    // Same basics the seller's Publish button needs: a photo and a price.
    const ready = await prisma.product.findMany({
      where: { ...where, basePrice: { gt: 0 }, images: { some: {} } },
      select: { id: true },
    });
    ({ count: changed } = await prisma.product.updateMany({
      where: { id: { in: ready.map(p => p.id) } },
      data: { published: true },
    }));
    skipped = ids.length - changed;
  }

  const { invalidateCache } = await import('@/lib/cache');
  await invalidateCache('products:*');
  await invalidateCache('product:detail:*');

  await prisma.auditLog
    .create({
      data: {
        adminId: user.id,
        action: `BULK_${action.toUpperCase()}_PRODUCTS`,
        details: JSON.stringify({ count: changed, ids: ids.slice(0, 100) }),
      },
    })
    .catch(() => {});

  return NextResponse.json({ changed, skipped });
}
