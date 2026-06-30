// Internal order-creation helper used by:
//   - The `createOrder` server action (the user-facing path that derives
//     `userId` from the NextAuth session).
//   - The PaySky callback (which derives `userId` from the verified
//     `paysky:pending:<MerchantReference>` Redis record so it doesn't have
//     to require a fresh session cookie — the SecureHash already proves the
//     merchant ref came from us).
//
// Splitting this out lets server-to-server callers create an order
// "as" a user without a cookie. The user-facing action stays the only
// path that consults `getServerSession`.

import { prisma } from '@/lib/prisma';
import {
  OrderStatus,
  OrderItemStatus,
  DiscountType,
  PaymentStatus,
  PaymentMethod,
} from '@/generated/client';
import { VAT_RATE, MAX_DISCOUNT_PCT, getShippingRate } from '@/lib/constants';
import { createOrderSchema } from '@/lib/validation';

export interface CreateOrderResult {
  success?: boolean;
  orderId?: string;
  error?: string;
}

export async function createOrderForUser(
  userId: string | null,
  formData: unknown,
  /** referralSlug read from the `brandy_ref` cookie by the server action (Task 32) */
  referralSlug?: string | null
): Promise<CreateOrderResult> {
  try {
    // ── 1. Validate Input ─────────────────────────────────────────────────────
    const validated = createOrderSchema.safeParse(formData);
    if (!validated.success) {
      return { error: 'Invalid input data' };
    }

    const {
      items: cartItemsInput,
      addressId,
      guestEmail,
      shippingAddress,
      couponCode,
      promoCode,
      paymentMethod,
      orderNotes,
      giftWrapping,
    } = validated.data;

    if (!userId && !guestEmail) {
      return { error: 'Unauthorized. Please log in or provide guest email.' };
    }

    // ── 2. Resolve shipping address ───────────────────────────────────────────
    const address = addressId
      ? await prisma.address.findUnique({ where: { id: addressId } })
      : null;

    if (addressId && !address) return { error: 'Address not found' };

    const resolvedAddress = address
      ? {
          fullName: undefined as string | undefined,
          phone: undefined as string | undefined,
          street: address.street,
          city: address.city,
          governorate: address.governorate,
          postalCode: address.postalCode || undefined,
          country: address.country,
        }
      : shippingAddress
        ? { ...shippingAddress }
        : null;

    if (!resolvedAddress) {
      return { error: 'A shipping address is required to place an order.' };
    }

    // Persist the guest contact email inside the address snapshot too, so
    // admin/seller views that already render the snapshot pick it up for free.
    const addressSnapshot = userId ? resolvedAddress : { ...resolvedAddress, email: guestEmail };

    let subtotal = 0;
    let loyaltyPointsToAward = 0; // accumulated per-item loyalty points (Task 8)
    const orderItemsData: Array<{
      variantId: string;
      productTitleSnapshot: string;
      sellerNameSnapshot: string;
      priceAtPurchase: number;
      quantity: number;
      status: OrderItemStatus;
    }> = [];

    for (const itemInput of cartItemsInput) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: itemInput.variantId },
        include: { product: { include: { seller: true } } },
      });

      if (!variant) {
        return {
          error:
            'One or more items in your cart are no longer available. Please refresh your cart and try again.',
        };
      }
      // Guard: reject deleted or unpublished products server-side
      if (variant.product.deletedAt || !variant.product.published) {
        return {
          error: `"${variant.product.title}" is no longer available. Please remove it from your cart.`,
        };
      }
      if (variant.stockCount < itemInput.quantity) {
        return { error: `Out of stock: ${variant.product.title}` };
      }

      // Use active flash-sale price when applicable, else variant/base price
      const now = new Date();
      const flashActive =
        variant.product.flashSalePrice != null &&
        variant.product.flashSaleEndsAt != null &&
        variant.product.flashSaleEndsAt > now;
      const price = flashActive
        ? (variant.product.flashSalePrice as number)
        : variant.price || variant.product.basePrice;
      const lineTotal = price * itemInput.quantity;
      subtotal += lineTotal;

      // Per-product loyalty points override (Task 8):
      // If the product has a loyaltyPointPct, award (pct / 100 * lineTotal) points,
      // otherwise fall back to the flat POINTS_PER_ORDER awarded once at the end.
      const pct = (variant.product as { loyaltyPointPct?: number | null }).loyaltyPointPct;
      if (typeof pct === 'number' && pct > 0) {
        loyaltyPointsToAward += Math.round((pct / 100) * lineTotal);
      }

      orderItemsData.push({
        variantId: variant.id,
        productTitleSnapshot: variant.product.title,
        sellerNameSnapshot: variant.product.seller.storeName,
        priceAtPurchase: price,
        quantity: itemInput.quantity,
        status: OrderItemStatus.PENDING,
      });
    }

    // ── 3. Apply Coupon or Affiliate Promo ────────────────────────────────────
    let discountAmount = 0;
    let couponId: string | null = null;
    let affiliateId: string | null = null;
    let affiliateDiscountPct = 0;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });
      if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
        const canUse = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
        const minMet = !coupon.minOrderValue || subtotal >= coupon.minOrderValue;

        if (canUse && minMet) {
          couponId = coupon.id;
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = subtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
          }
        }
      }
    } else if (promoCode) {
      try {
        const { applyPromoToCheckout } = await import('@/lib/checkout-affiliate');
        const promoResult = await applyPromoToCheckout({
          promoCode,
          orderTotalEgp: subtotal,
          buyerId: userId || '',
        });
        if (promoResult.affiliateId) {
          discountAmount = promoResult.discountAmountEgp;
          affiliateId = promoResult.affiliateId;
          affiliateDiscountPct = promoResult.discountPct;
        }
      } catch (err) {
        console.error('Failed to apply affiliate promo code:', err);
      }
    }

    // ── Cookie-based referral attribution (Task 32) ───────────────────────────
    // If the buyer landed via a referral link (/ref/[slug]) and has not already
    // been attributed via a promo code, attribute the sale to the referrer.
    // No discount is given for referral-link attribution (the discount was the
    // incentive when they typed the code; the link is purely a tracking path).
    if (!affiliateId && referralSlug && userId) {
      try {
        const referrer = await prisma.affiliate.findUnique({
          where: { referralSlug: referralSlug.toUpperCase() },
        });
        if (referrer && referrer.status === 'ACTIVE') {
          affiliateId = referrer.id;
          // No discount for cookie-only attribution — buyer didn't enter a code
        }
      } catch (err) {
        console.error('Failed to resolve referral slug:', err);
      }
    }

    // Hard cap: total discount must not exceed MAX_DISCOUNT_PCT of subtotal
    discountAmount = Math.min(discountAmount, subtotal * MAX_DISCOUNT_PCT);

    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const vatAmount = subtotalAfterDiscount * VAT_RATE;
    const shippingFee = getShippingRate(resolvedAddress.governorate);
    const finalTotal = subtotalAfterDiscount + vatAmount + shippingFee;

    // ── 4. Execute Transaction ───────────────────────────────────────────────
    const order = await prisma.$transaction(async tx => {
      // Stock decrement
      for (const item of cartItemsInput) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockCount: { gte: item.quantity } },
          data: { stockCount: { decrement: item.quantity } },
        });
        if (updated.count === 0) throw new Error(`Stock error for variant ${item.variantId}`);
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          guestEmail: userId ? null : guestEmail,
          couponId,
          totalAmount: finalTotal,
          discountAmount,
          shippingFee,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.UNPAID,
          status: OrderStatus.PENDING_PAYMENT,
          shippingAddressSnapshot: JSON.stringify(addressSnapshot),
          orderNotes: orderNotes || null,
          giftWrapping: giftWrapping || false,
          items: { create: orderItemsData },
        },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // ── 5. Post-Order Actions ────────────────────────────────────────────────
    if (affiliateId) {
      try {
        const { recordAffiliateSale } = await import('@/lib/checkout-affiliate');
        await recordAffiliateSale({
          orderId: order.id,
          affiliateId,
          buyerId: userId || null,
          orderTotalBeforeDiscountEgp: subtotal,
          orderTotalAfterDiscountEgp: subtotalAfterDiscount,
          discountPct: affiliateDiscountPct,
          discountAmountEgp: discountAmount,
        });
      } catch (err) {
        console.error('Failed to record affiliate sale:', err);
      }
    }

    // ── Activate referrer bonus on joiner's first order ──────────────────
    if (userId) {
      try {
        // Check if this buyer is an affiliate who was referred by someone else
        const joinerAffiliate = await prisma.affiliate.findUnique({ where: { userId } });
        if (joinerAffiliate) {
          const referral = await prisma.affiliateReferral.findFirst({
            where: {
              newAffiliateId: joinerAffiliate.id,
              firstOrderTriggered: false,
              referrerBonusId: { not: null },
            },
          });
          if (referral?.referrerBonusId) {
            // Count completed orders for this user to confirm this is their first
            const prevOrders = await prisma.order.count({
              where: { userId, id: { not: order.id }, status: { not: 'CANCELLED' } },
            });
            if (prevOrders === 0) {
              await prisma.$transaction([
                prisma.affiliateBonus.update({
                  where: { id: referral.referrerBonusId },
                  data: { status: 'ACTIVE', activatedAt: new Date() },
                }),
                prisma.affiliateReferral.update({
                  where: { id: referral.id },
                  data: { firstOrderTriggered: true, firstOrderId: order.id },
                }),
              ]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to activate referrer bonus:', err);
      }
    }

    if (userId) {
      // Award loyalty points. Use per-product accumulation if any product had
      // loyaltyPointPct set (Task 8), otherwise fall back to the flat bonus.
      try {
        const loyaltyMod = await import('@/app/actions/loyalty');
        await loyaltyMod.addLoyaltyPoints(
          userId,
          subtotal,
          loyaltyPointsToAward > 0 ? loyaltyPointsToAward : undefined,
          loyaltyPointsToAward > 0
            ? `Earned ${loyaltyPointsToAward} pts (product loyalty %)`
            : undefined
        );
      } catch (err) {
        console.error('Failed to award loyalty points:', err);
      }
    }

    // Best-effort confirmation email. Failures here MUST NOT block the order.
    void (async () => {
      try {
        const m = await import('@/lib/email');
        const orderWithItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!orderWithItems) return;

        if (userId) {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user?.email) {
            await m.sendEmail({
              to: user.email,
              subject: `Order Confirmation - ${order.id.slice(0, 8)}`,
              html: m.generateOrderConfirmationEmail(orderWithItems, user),
            });
          }
        } else if (guestEmail) {
          await m.sendEmail({
            to: guestEmail,
            subject: `Order Confirmation - ${order.id.slice(0, 8)}`,
            html: m.generateOrderConfirmationEmail(orderWithItems, null),
          });
        }
      } catch (err) {
        console.error('Order confirmation email failed:', err);
      }
    })();

    return { success: true, orderId: order.id };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('createOrderForUser error:', err);
    return { error: err.message || 'Failed to create order' };
  }
}
