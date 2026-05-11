import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cart/validate
 * Body: { variantIds: string[] }
 * Returns:
 *   {
 *     valid:   string[],                // IDs the caller should keep as-is.
 *     invalid: string[],                // IDs the caller should drop entirely.
 *     rewrites: { [oldId: string]: string } // Legacy product IDs we've
 *                                           // mapped to a real variant ID.
 *                                           // The client should swap the
 *                                           // cart item's id for the new one.
 *     stock:   { [variantId: string]: number } // Stock for the valid items.
 *   }
 *
 * This endpoint is used by the cart drawer and the checkout page to
 * self-heal a cart after a DB reseed or after a seller deletes a product.
 *
 * IMPORTANT: Earlier in the project's life some call sites (shop, wishlist,
 * etc.) were adding items to the cart using the PRODUCT id instead of the
 * VARIANT id. We don't want to just evict those — we look up the product's
 * default variant and hand it back as a `rewrite` so the item keeps
 * working.
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

    const submitted = Array.from(new Set(ids as string[]));
    if (submitted.length === 0) {
      return NextResponse.json({ valid: [], invalid: [], rewrites: {}, stock: {} });
    }

    // 1) Try to match each submitted id against ProductVariant.id.
    const foundVariants = await prisma.productVariant.findMany({
      where: { id: { in: submitted } },
      select: {
        id: true,
        stockCount: true,
        product: { select: { published: true, deletedAt: true } },
      },
    });
    const variantIds = new Set(
      foundVariants
        .filter((v) => v.product?.published !== false && !v.product?.deletedAt)
        .map((v) => v.id),
    );

    // 2) The remainder might be legacy product IDs. Look them up.
    const remaining = submitted.filter((id) => !variantIds.has(id));
    const rewrites: Record<string, string> = {};
    const rewriteStock: Record<string, number> = {};

    if (remaining.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: remaining },
          published: true,
          deletedAt: null,
        },
        select: {
          id: true,
          variants: {
            orderBy: { stockCount: 'desc' },
            select: { id: true, stockCount: true },
          },
        },
      });

      for (const p of products) {
        const first = p.variants[0];
        if (first) {
          rewrites[p.id] = first.id;
          rewriteStock[first.id] = first.stockCount;
        }
      }
    }

    const invalid = submitted.filter(
      (id) => !variantIds.has(id) && !(id in rewrites),
    );

    const stock: Record<string, number> = {
      ...Object.fromEntries(foundVariants.map((v) => [v.id, v.stockCount])),
      ...rewriteStock,
    };

    return NextResponse.json({
      valid: submitted.filter((id) => variantIds.has(id)),
      invalid,
      rewrites,
      stock,
    });
  } catch (error) {
    console.error('[cart/validate] error:', error);
    return NextResponse.json({ message: 'Validation failed' }, { status: 500 });
  }
}
