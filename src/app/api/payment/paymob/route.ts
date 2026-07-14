import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VAT_RATE, getShippingRate } from '@/lib/constants';
import { SessionUser } from '@/types';
import { z } from 'zod';

/**
 * PayMob Egypt payment integration.
 * Creates a payment token that the client uses with PayMob's iFrame.
 *
 * Env vars required:
 *   PAYMOB_API_KEY
 *   PAYMOB_INTEGRATION_ID
 *   PAYMOB_IFRAME_ID
 *
 * See https://docs.paymob.com/ for details.
 */
const payMobSchema = z.object({
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
      id: z.string().optional(),
      fullName: z.string().optional(),
      phone: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      governorate: z.string().optional(),
    })
    .optional(),
  couponId: z.string().optional(),
});

async function getPayMobAuthToken(): Promise<string | null> {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return data.token || null;
}

async function createPayMobOrder(authToken: string, amountCents: number, merchantOrderId: string) {
  const res = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: 'false',
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: merchantOrderId,
      items: [],
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: number };
}

async function createPayMobPaymentKey(
  authToken: string,
  orderId: number,
  amountCents: number,
  billingData: Record<string, string>
) {
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;
  if (!integrationId) return null;

  const res = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      currency: 'EGP',
      order_id: orderId,
      billing_data: billingData,
      integration_id: Number(integrationId),
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { token: string };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = payMobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cartItems, addressInfo, couponId } = parsed.data;
    const userId = (session.user as SessionUser).id;

    // Compute the total server-side (anti-tamper)
    let subtotal = 0;
    for (const item of cartItems) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
        include: { product: true },
      });
      if (!variant) continue;
      const price = variant.price || variant.product.basePrice;
      subtotal += price * item.qty;
    }

    let discount = 0;
    if (couponId) {
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
        discount =
          coupon.discountType === 'PERCENTAGE'
            ? Math.min(subtotal * (coupon.discountValue / 100), coupon.maxDiscount ?? Infinity)
            : Math.min(coupon.discountValue, subtotal);
      }
    }

    const shipping = addressInfo?.governorate ? getShippingRate(addressInfo.governorate) : 50;
    const vat = (subtotal - discount) * VAT_RATE;
    const total = Math.max(0, subtotal - discount + vat + shipping);
    const amountCents = Math.round(total * 100);

    // If PayMob env vars are missing, return a graceful mock response
    const apiKey = process.env.PAYMOB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          mockMode: true,
          message: 'PAYMOB_API_KEY is not configured. Showing mock payment flow.',
          total: total.toFixed(2),
        },
        { status: 200 }
      );
    }

    // 1. Authenticate
    const authToken = await getPayMobAuthToken();
    if (!authToken) {
      return NextResponse.json({ message: 'PayMob authentication failed' }, { status: 502 });
    }

    // 2. Create order in PayMob
    const merchantOrderId = `${userId}-${Date.now()}`;
    const payMobOrder = await createPayMobOrder(authToken, amountCents, merchantOrderId);
    if (!payMobOrder) {
      return NextResponse.json({ message: 'Failed to create PayMob order' }, { status: 502 });
    }

    // 3. Generate payment key
    const billingData: Record<string, string> = {
      first_name: (addressInfo?.fullName || 'Customer').split(' ')[0] || 'Customer',
      last_name: (addressInfo?.fullName || 'Customer').split(' ').slice(1).join(' ') || 'User',
      email: session.user.email || 'noemail@brandy.com',
      phone_number: addressInfo?.phone || '+201000000000',
      street: addressInfo?.street || 'NA',
      city: addressInfo?.city || 'Cairo',
      country: 'EG',
      state: addressInfo?.governorate || 'Cairo',
      apartment: 'NA',
      floor: 'NA',
      building: 'NA',
      shipping_method: 'NA',
      postal_code: 'NA',
    };
    const paymentKey = await createPayMobPaymentKey(
      authToken,
      payMobOrder.id,
      amountCents,
      billingData
    );
    if (!paymentKey) {
      return NextResponse.json({ message: 'Failed to create PayMob payment key' }, { status: 502 });
    }

    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const iframeUrl = iframeId
      ? `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey.token}`
      : null;

    // Cache the pending cart in Redis so the callback can finalize the order
    // server-side without trusting any client-supplied data.
    try {
      const { redis } = await import('@/lib/redis');
      await redis.set(
        `paymob:pending:${merchantOrderId}`,
        JSON.stringify({
          userId,
          cartItems,
          addressInfo,
          couponId,
          subtotal,
          total,
          createdAt: new Date().toISOString(),
        }),
        'EX',
        60 * 60 // 1-hour TTL — matches PayMob's token lifetime
      );
    } catch (err) {
      // Non-fatal — callback will still work if Redis is unavailable, but
      // we won't be able to auto-confirm without the pending record.
      console.warn('[paymob] Failed to cache pending cart:', err);
    }

    return NextResponse.json({
      success: true,
      paymentToken: paymentKey.token,
      orderId: payMobOrder.id,
      merchantOrderId,
      iframeUrl,
      total: total.toFixed(2),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[paymob] Error:', err);
    return NextResponse.json({ message: err.message || 'PayMob request failed' }, { status: 500 });
  }
}
