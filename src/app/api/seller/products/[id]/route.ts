import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { toggleProductPublishedForSeller } from '@/lib/seller-core';
import { CORS_HEADERS } from '@/lib/seller-mobile';

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: CORS_HEADERS });

// PATCH /api/seller/products/[id]  { published?, variants?: [{ id, stockCount }] }
export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/seller/products/[id]'>) {
  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'SELLER') return json({ error: 'Forbidden' }, 403);

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return json({ error: 'Seller profile not found' }, 404);

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, sellerId: seller.id, deletedAt: null },
    select: { published: true },
  });
  if (!product) return json({ error: 'Product not found' }, 404);

  const body = (await req.json().catch(() => ({}))) as {
    published?: boolean;
    variants?: { id?: string; stockCount?: number }[];
  };

  if (Array.isArray(body.variants) && body.variants.length) {
    const updates = body.variants.filter(
      v => typeof v.id === 'string' && Number.isInteger(v.stockCount) && v.stockCount! >= 0
    );
    if (updates.length !== body.variants.length)
      return json({ error: 'stockCount must be a whole number ≥ 0' }, 400);
    // productId in the where clause enforces ownership per variant.
    const results = await prisma.$transaction(
      updates.map(v =>
        prisma.productVariant.updateMany({
          where: { id: v.id, productId: id },
          data: { stockCount: v.stockCount },
        })
      )
    );
    if (results.some(r => r.count === 0)) return json({ error: 'Variant not found' }, 404);
    const { invalidateCache } = await import('@/lib/cache');
    await invalidateCache('product:detail:*');
  }

  let published = product.published;
  if (typeof body.published === 'boolean' && body.published !== product.published) {
    const r = await toggleProductPublishedForSeller(user.id, id, body.published);
    // Business-rule refusal (no image, unverified email, ...): 422 carrying the reason.
    if (r.error) return json({ ok: false, published, error: r.error }, 422);
    published = r.published!;
  }

  return json({ ok: true, published });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'PATCH, OPTIONS' },
  });
}
