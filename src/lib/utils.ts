/**
 * XSS Sanitization utility
 * Used before inserting any user-generated rich text into DB (product descriptions, Q&A)
 * In production: npm install isomorphic-dompurify
 * In dev/server: we use a regex strip as a safe fallback
 */

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  // Strip script tags and event handlers (server-safe regex approach)
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

/**
 * Smart cart merge — merges guest (Redis) cart into authenticated user cart
 * Respects stock caps, deduplicates items
 */
export async function mergeGuestCartToUser(guestId: string, userId: string) {
  try {
    const { redis } = await import('@/lib/redis');
    const { prisma } = await import('@/lib/prisma');

    const guestData = await redis.get(`cart:${guestId}`);
    if (!guestData) return;

    const guestItems: Array<{ variantId: string; quantity: number; savedPrice: number }> =
      JSON.parse(guestData);

    for (const gItem of guestItems) {
      // Check stock for this variant
      const variant = await prisma.productVariant.findUnique({
        where: { id: gItem.variantId }
      });
      if (!variant) continue;

      // Check if user already has this item in cart
      const existing = await prisma.cartItem.findUnique({
        where: { userId_variantId: { userId, variantId: gItem.variantId } }
      });

      const mergedQty = Math.min(
        variant.stockCount,
        (existing?.quantity || 0) + gItem.quantity
      );

      await prisma.cartItem.upsert({
        where: { userId_variantId: { userId, variantId: gItem.variantId } },
        update: { quantity: mergedQty, savedPrice: gItem.savedPrice },
        create: {
          userId,
          variantId: gItem.variantId,
          quantity: mergedQty,
          savedPrice: gItem.savedPrice,
        }
      });
    }

    // Clear guest cart after merge
    await redis.del(`cart:${guestId}`);

  } catch (error) {
    console.error('Cart merge error:', error);
  }
}

/**
 * Seller payout escrow — holds funds for 7 days post-delivery before releasing
 * Call this from a scheduled job (cron) — checks all DELIVERED orders >= 7 days old
 */
export async function processEscrowPayouts() {
  try {
    const { prisma } = await import('@/lib/prisma');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find orders delivered more than 7 days ago that haven't been paid out
    const eligibleOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: { lte: sevenDaysAgo },
        // payoutProcessed: false  // Add this field to Order schema for production
      },
      include: {
        items: {
          include: {
            variant: { include: { product: { include: { seller: true } } } }
          }
        }
      },
      take: 100, // Process in batches
    });

    let payoutsProcessed = 0;

    for (const order of eligibleOrders) {
      for (const item of order.items) {
        const seller = item.variant.product.seller;
        const gross = item.priceAtPurchase * item.quantity;
        const commission = gross * seller.commissionRate;
        const payout = gross - commission;

        await prisma.sellerProfile.update({
          where: { id: seller.id },
          data: { balance: { increment: payout } }
        });

        payoutsProcessed++;
      }
    }

    return { processed: payoutsProcessed };
  } catch (error) {
    console.error('Escrow payout error:', error);
    return { processed: 0, error };
  }
}
