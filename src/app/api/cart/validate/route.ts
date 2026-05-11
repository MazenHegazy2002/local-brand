import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cart/validate
 * Body: { variantIds: string[] }
 * Returns: { valid: string[], invalid: string[] }
 *
 * Used by the cart drawer / checkout page to detect items whose variant has
 * been deleted (for example after a database reseed). The client can then
 * silently drop the dead entries before showing the cart total.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body?.variantIds;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      return NextResponse.json(
        { message: 'variantIds must be an array of strings' },
        { status: 400 },
      );
    }

    const variantIds = ids as string[];
    if (variantIds.length === 0) {
      return NextResponse.json({ valid: [], invalid: [] });
    }

    const found = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stockCount: true, product: { select: { published: true } } },
    });

    const validIds = new Set(
      found
        // Treat soft-deleted / unpublished products as invalid too so the
        // user can't try to check out something that's no longer for sale.
        .filter((v) => v.product?.published !== false)
        .map((v) => v.id),
    );

    const invalid = variantIds.filter((id) => !validIds.has(id));
    return NextResponse.json({
      valid: variantIds.filter((id) => validIds.has(id)),
      invalid,
      // Bonus: surface stock for the still-valid items so the cart can
      // clamp quantities client-side too.
      stock: Object.fromEntries(found.map((v) => [v.id, v.stockCount])),
    });
  } catch (error) {
    console.error('[cart/validate] error:', error);
    return NextResponse.json({ message: 'Validation failed' }, { status: 500 });
  }
}
