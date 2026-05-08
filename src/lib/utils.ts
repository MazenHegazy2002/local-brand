/**
 * XSS Sanitization utility using isomorphic-dompurify.
 * Used before inserting any user-generated rich text into DB (product descriptions, Q&A).
 * Works server-side (Node) via JSDOM, and client-side natively.
 */
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'a',
      'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    // Drop all inline event handlers and unsafe protocols.
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'style',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  });
}

/**
 * Lightweight className helper used by some UI primitives.
 * Filters out falsy values and joins the rest with a space.
 */
export function cn(
  ...inputs: Array<string | number | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(' ');
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
    return { success: false, error };
  }
}

/**
 * Seller payout escrow — holds funds for 7 days post-delivery before releasing
 * Call this from a scheduled job (cron) — checks all DELIVERED orders >= 7 days old
 */
export async function processEscrowPayouts() {
  try {
    const { prisma } = await import('@/lib/prisma');
    const { ESCROW_HOLD_DAYS } = await import('./constants');

    const escrowDaysAgo = new Date(Date.now() - ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000);

    // Find orders delivered more than ESCROW_HOLD_DAYS days ago that haven't been paid out
    const eligibleOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: { lte: escrowDaysAgo },
        payoutProcessedAt: null // Only orders not yet processed
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
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const seller = item.variant.product.seller;
          const gross = item.priceAtPurchase * item.quantity;
          const commission = gross * seller.commissionRate;
          const payout = gross - commission;

          await tx.sellerProfile.update({
            where: { id: seller.id },
            data: { balance: { increment: payout } }
          });

          // Create payout record
          await tx.payout.create({
            data: {
              sellerId: seller.id,
              amount: payout,
              status: 'PAID',
              processedAt: new Date(),
              bankDetails: seller.bankAccount || 'Internal Wallet'
            }
          });
        }

        // Mark order as processed
        await tx.order.update({
          where: { id: order.id },
          data: { payoutProcessedAt: new Date() }
        });
      });

      payoutsProcessed++;
    }

    return { processed: payoutsProcessed };
  } catch (error) {
    return { processed: 0, error };
  }
}
