import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VAT_RATE, MAX_DISCOUNT_PCT, getShippingRate } from '@/lib/constants';
import { SessionUser } from '@/types';
import { z } from 'zod';
import {
  buildMerchantReference,
  formatPaySkyDate,
  getPaySkyConfig,
  getPaySkyLightboxUrl,
  signLightboxRequest,
  toPiasters,
} from '@/lib/paysky';

/**
 * POST /api/payment/paysky
 *
 * Builds the signed Lightbox.Checkout.configure object for PaySky PayForm Plus.
 * The client should pass this verbatim to `Lightbox.Checkout.configure` after loading
 * the LightBox.js script returned in `lightboxUrl`.
 */

const paySkySchema = z.object({
  cartItems: z
    .array(
      z.object({
        id: z.string(),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
  addressInfo: z
    .object({
      governorate: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      fullName: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  couponId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = paySkySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cartItems, addressInfo, couponId } = parsed.data;
    const userId = (session.user as SessionUser).id;

    // 1. Server-side total computation (anti-tamper)
    let subtotal = 0;
    for (const item of cartItems) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
        include: { product: true },
      });
      if (!variant) {
        return NextResponse.json(
          { message: `Product variant ${item.id} not found` },
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
          { message: `Out of stock: ${variant.product.title}` },
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
    }

    let discount = 0;
    let promoCode: string | undefined = undefined;

    if (couponId) {
      if (couponId.startsWith('aff_')) {
        const extractedPromo = couponId.substring(4);
        const { applyPromoToCheckout } = await import('@/lib/checkout-affiliate');
        const promoResult = await applyPromoToCheckout({
          promoCode: extractedPromo,
          orderTotalEgp: subtotal,
          buyerId: userId,
        });
        if (promoResult.affiliateId) {
          discount = promoResult.discountAmountEgp;
          promoCode = extractedPromo;
        }
      } else {
        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
          discount =
            coupon.discountType === 'PERCENTAGE'
              ? Math.min(
                  subtotal * (coupon.discountValue / 100),
                  coupon.maxDiscount ?? Number.POSITIVE_INFINITY
                )
              : Math.min(coupon.discountValue, subtotal);
        }
      }
    }

    // Hard cap: total discount must not exceed MAX_DISCOUNT_PCT of subtotal
    discount = Math.min(discount, subtotal * MAX_DISCOUNT_PCT);

    const shipping = addressInfo?.governorate ? getShippingRate(addressInfo.governorate) : 50;
    const subtotalAfter = Math.max(0, subtotal - discount);
    const vat = subtotalAfter * VAT_RATE;
    const total = subtotalAfter + vat + shipping;

    if (total <= 0) {
      return NextResponse.json(
        { message: 'Cart total must be greater than zero' },
        { status: 400 }
      );
    }

    // 2. Validate PaySky configuration
    const config = getPaySkyConfig();
    if (!config) {
      // Mock mode for development — return a stub the client can render as a "demo" flow.
      return NextResponse.json(
        {
          mockMode: true,
          message:
            'PaySky env vars (PAYSKY_MERCHANT_ID, PAYSKY_TERMINAL_ID, PAYSKY_MERCHANT_SECRET) ' +
            'are not configured. Returning mock parameters.',
          total: total.toFixed(2),
          breakdown: {
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            vat: vat.toFixed(2),
            shipping: shipping.toFixed(2),
          },
        },
        { status: 200 }
      );
    }

    // 3. Build & sign the Lightbox request
    const merchantReference = buildMerchantReference(userId);
    const trxDateTime = formatPaySkyDate();
    const amount = toPiasters(total);

    const secureHash = signLightboxRequest(config.merchantSecret, {
      Amount: amount,
      DateTimeLocalTrxn: trxDateTime,
      MerchantId: config.merchantId,
      MerchantReference: merchantReference,
      TerminalId: config.terminalId,
    });

    // 4. Cache the cart in Redis so we can finalize the order on callback (the
    //    callback only carries PaySky's IDs back, not the cart contents).
    try {
      const { redis } = await import('@/lib/redis');
      const pendingKey = `paysky:pending:${merchantReference}`;
      await redis.set(
        pendingKey,
        JSON.stringify({
          userId,
          cartItems,
          addressInfo,
          couponId: promoCode ? undefined : couponId,
          promoCode,
          subtotal,
          discount,
          vat,
          shipping,
          total,
          createdAt: new Date().toISOString(),
        }),
        'EX',
        60 * 60 // 1 hour to complete the payment
      );
    } catch (err) {
      // Redis failure must NOT break checkout — we'll fall back to client-supplied data on callback.
      console.warn('[paysky] Failed to cache pending payment in Redis:', err);
    }

    return NextResponse.json({
      success: true,
      env: config.env,
      lightboxUrl: getPaySkyLightboxUrl(config.env),
      lightboxConfig: {
        MID: config.merchantId,
        TID: config.terminalId,
        AmountTrxn: amount,
        MerchantReference: merchantReference,
        TrxDateTime: trxDateTime,
        SecureHash: secureHash,
      },
      breakdown: {
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        vat: vat.toFixed(2),
        shipping: shipping.toFixed(2),
        total: total.toFixed(2),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[paysky] Error:', err);
    return NextResponse.json({ message: err.message || 'PaySky request failed' }, { status: 500 });
  }
}
