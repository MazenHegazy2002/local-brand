import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DiscountType } from '@/generated/client';
import {
  VAT_RATE,
  MAX_DISCOUNT_PCT,
  STRIPE_API_VERSION,
  getShippingRate,
  LOYALTY_POINT_VALUE,
} from '@/lib/constants';
import { SessionUser, ProductImage } from '@/types';
import type Stripe from 'stripe';
import crypto from 'crypto';

// Stripe payment intent. Real keys provided via env (STRIPE_SECRET_KEY).
let stripe: Stripe | null = null;

async function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    });
  }
  return stripe;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const cartItems: Array<{ id: string; qty: number }> = Array.isArray(body?.cartItems)
      ? body.cartItems
      : [];
    const addressInfo: { id?: string; governorate?: string } = body?.addressInfo || {};
    const couponId: string | undefined = body?.couponId;
    const couponCode: string | undefined = body?.couponCode;
    const pointsRedeemed: number =
      typeof body?.pointsRedeemed === 'number' ? body.pointsRedeemed : 0;
    const userId = (session.user as SessionUser).id;

    if (cartItems.length === 0) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });
    }

    // 1. Server-side price re-calculation (anti-tamper). Reject anything that
    //    can't be resolved to a real ProductVariant — we used to fall back to
    //    treating the id as a Product id, but the cart validator has now made
    //    that path unreachable on a healthy cart, and the fallback let mismatched
    //    pricing slip through. Better to fail loudly.
    let subtotal = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of cartItems) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
        include: {
          product: {
            include: { images: { where: { isPrimary: true } } },
          },
        },
      });
      if (!variant) {
        return NextResponse.json(
          {
            message:
              'One or more items in your cart are no longer available. ' +
              'Please refresh your cart and try again.',
          },
          { status: 400 }
        );
      }
      // Guard: reject deleted or unpublished products server-side
      if (variant.product.deletedAt || !variant.product.published) {
        return NextResponse.json(
          {
            message: `"${variant.product.title}" is no longer available. Please remove it from your cart.`,
          },
          { status: 400 }
        );
      }
      if (variant.stockCount < item.qty) {
        return NextResponse.json(
          { message: `${variant.product.title} is out of stock` },
          { status: 400 }
        );
      }

      // Use active flash-sale price when applicable, else variant/base price
      const flashActive =
        variant.product.flashSalePrice != null &&
        variant.product.flashSaleEndsAt != null &&
        variant.product.flashSaleEndsAt > new Date();
      const price = flashActive
        ? (variant.product.flashSalePrice as number)
        : variant.price || variant.product.basePrice;
      subtotal += price * item.qty;

      lineItems.push({
        price_data: {
          currency: 'egp',
          product_data: {
            name: variant.product.title,
            images: variant.product.images.map((i: ProductImage) => i.url),
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.qty,
      });
    }

    // 2. Apply coupon discount
    let discountAmount = 0;
    let resolvedCouponCode: string | null = null;
    let promoCode: string | undefined = undefined;

    if (couponId) {
      if (couponId.startsWith('aff_')) {
        const extractedPromo = couponId.substring(4);
        try {
          const { applyPromoToCheckout } = await import('@/lib/checkout-affiliate');
          const promoResult = await applyPromoToCheckout({
            promoCode: extractedPromo,
            orderTotalEgp: subtotal,
            buyerId: userId,
          });
          if (promoResult.affiliateId) {
            discountAmount = promoResult.discountAmountEgp;
            promoCode = extractedPromo;
          }
        } catch (err) {
          console.error('[payment/intent] failed to apply affiliate promo:', err);
        }
      } else {
        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
          resolvedCouponCode = coupon.code;
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = subtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          } else {
            discountAmount = coupon.discountValue;
          }
        }
      }
    }

    // Validate loyalty points if requested
    let pointsDiscount = 0;
    if (pointsRedeemed > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true },
      });
      if (user && user.loyaltyPoints >= pointsRedeemed) {
        pointsDiscount = pointsRedeemed * LOYALTY_POINT_VALUE;
      }
    }

    // Hard cap: total discount must not exceed MAX_DISCOUNT_PCT of subtotal
    discountAmount = Math.min(discountAmount + pointsDiscount, subtotal * MAX_DISCOUNT_PCT);

    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

    let shippingFee = addressInfo?.governorate ? getShippingRate(addressInfo.governorate) : 50;
    try {
      const { getSetting } = await import('@/lib/admin-settings-registry');
      const freeShippingEnabled = await getSetting<boolean>('FREE_SHIPPING_ENABLED');
      const freeShippingThreshold = await getSetting<number>('FREE_SHIPPING_THRESHOLD');
      if (freeShippingEnabled && subtotalAfterDiscount >= freeShippingThreshold) {
        shippingFee = 0;
      }
    } catch {
      const { FREE_SHIPPING_THRESHOLD } = await import('@/lib/shipping-rates');
      if (subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD) {
        shippingFee = 0;
      }
    }

    const vatAmount = subtotalAfterDiscount * VAT_RATE;
    const total = subtotalAfterDiscount + vatAmount + shippingFee;

    // 3. Generate idempotency key to prevent double-charge on retry
    const idempotencyKey = `${userId}-${crypto.randomUUID()}`;

    // 4. Cache the pending cart in Redis so the webhook can finalize the order
    //    without needing the cart contents back from Stripe. Mirrors the
    //    PaySky pattern at `paysky:pending:<MerchantReference>`. Earlier
    //    versions of this route did NOT cache anything, and the webhook was
    //    looking up `cart:${userId}` which nothing ever wrote — so live Stripe
    //    payments would silently fail to create the order.
    try {
      const { redis } = await import('@/lib/redis');
      const pendingKey = `stripe:pending:${idempotencyKey}`;
      await redis.set(
        pendingKey,
        JSON.stringify({
          userId,
          cartItems: cartItems.map(c => ({ id: c.id, qty: c.qty })),
          addressId: addressInfo?.id,
          couponCode: resolvedCouponCode || couponCode || undefined,
          promoCode: promoCode || undefined,
          pointsRedeemed,
          subtotal,
          discount: discountAmount,
          vat: vatAmount,
          shipping: shippingFee,
          total,
          createdAt: new Date().toISOString(),
        }),
        'EX',
        60 * 60 // 1 hour to complete the payment
      );
    } catch (err) {
      // Redis being down must not block checkout; the webhook will refuse
      // to finalize but the user can still retry from a good state.
      console.warn('[payment/intent] failed to cache pending cart:', err);
    }

    // 5. Stripe Payment Intent (if Stripe key available, else return mock)
    const stripeInstance = await getStripe();

    if (stripeInstance) {
      const paymentIntent = await stripeInstance.paymentIntents.create(
        {
          amount: Math.round(total * 100),
          currency: 'egp',
          metadata: {
            userId,
            idempotencyKey,
            addressId: addressInfo?.id || '',
            // NOTE: we deliberately do NOT serialise the address into Stripe
            // metadata here. Metadata values are capped at 500 chars and
            // longer Egyptian addresses get truncated. The pending cart in
            // Redis has the addressId; the webhook re-resolves the snapshot
            // through createOrder.
          },
        },
        { idempotencyKey }
      );

      return NextResponse.json(
        {
          clientSecret: paymentIntent.client_secret,
          idempotencyKey,
          breakdown: {
            subtotal: subtotal.toFixed(2),
            vat: vatAmount.toFixed(2),
            shipping: shippingFee.toFixed(2),
            discount: discountAmount.toFixed(2),
            total: total.toFixed(2),
          },
          // Echo back so dev clients can compare cached cart against UI
          lineItems: lineItems.map(l => ({
            name: l.price_data?.product_data?.name,
            unit: l.price_data?.unit_amount,
            qty: l.quantity,
          })),
        },
        { status: 200 }
      );
    }

    // 6. Fallback: Mock payment intent for development
    return NextResponse.json(
      {
        clientSecret: `mock_pi_${idempotencyKey}_secret`,
        idempotencyKey,
        mockMode: true,
        breakdown: {
          subtotal: subtotal.toFixed(2),
          vat: vatAmount.toFixed(2),
          shipping: shippingFee.toFixed(2),
          discount: discountAmount.toFixed(2),
          total: total.toFixed(2),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Payment Intent Error:', err);
    return NextResponse.json({ message: err.message || 'Payment failed' }, { status: 500 });
  }
}
