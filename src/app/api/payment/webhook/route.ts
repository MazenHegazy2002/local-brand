import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { createOrderForUser } from '@/lib/order-creator';

// Stripe webhook receiver. Verifies signature in live mode (when both
// STRIPE_WEBHOOK_SECRET and the `stripe-signature` header are present),
// otherwise parses the body directly (dev mode).
//
// On `payment_intent.succeeded` we look up the cached pending cart in Redis
// (key: `stripe:pending:<idempotencyKey>`, written by /api/payment/intent),
// run it through the canonical createOrder action, and flip the order to
// PAID + CONFIRMED. The previous version read `cart:${userId}` which nothing
// ever wrote — live Stripe payments silently failed to create the order.
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    let event: Stripe.Event;

    if (isProd && (!webhookSecret || !sig)) {
      console.error(
        '[stripe webhook] signature verification required in production but webhook secret or signature is missing'
      );
      return NextResponse.json({ message: 'Signature verification required' }, { status: 400 });
    }

    if (webhookSecret && sig) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
      });
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error('[stripe webhook] signature verification failed:', err);
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Dev mode — parse raw body without verification
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const idempotencyKey = intent.metadata?.idempotencyKey;
      if (!idempotencyKey) {
        console.warn('[stripe webhook] payment_intent.succeeded without idempotencyKey metadata');
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Idempotency — skip if we've already finalized this intent.
      const existingOrder = await prisma.order.findFirst({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existingOrder) {
        return NextResponse.json({ received: true, alreadyProcessed: true }, { status: 200 });
      }

      const { redis } = await import('@/lib/redis');
      const pendingKey = `stripe:pending:${idempotencyKey}`;
      const pendingRaw = await redis.get(pendingKey).catch(() => null);
      if (!pendingRaw) {
        console.error(
          '[stripe webhook] pending cart missing for idempotencyKey',
          idempotencyKey,
          '— customer may need to retry checkout'
        );
        return NextResponse.json({ received: true, missingPending: true }, { status: 200 });
      }

      const pending = JSON.parse(pendingRaw) as {
        userId: string;
        cartItems: Array<{ id: string; qty: number }>;
        addressId?: string;
        couponCode?: string;
      };

      // Use the session-less helper. Stripe webhooks come from Stripe's
      // servers and don't carry a user session; the userId in the pending
      // cart is our trust root after signature verification above.
      const result = await createOrderForUser(pending.userId, {
        items: pending.cartItems.map(c => ({ variantId: c.id, quantity: c.qty })),
        addressId: pending.addressId,
        paymentMethod: 'CREDIT_CARD',
        couponCode: pending.couponCode,
      });

      if (result.success && result.orderId) {
        await prisma.order.update({
          where: { id: result.orderId },
          data: {
            paymentStatus: 'PAID',
            paymentId: intent.id,
            status: 'CONFIRMED',
            idempotencyKey,
          },
        });
      } else {
        console.error('[stripe webhook] createOrder failed for', idempotencyKey, result.error);
      }

      // Clear the pending cache regardless — the user has already been charged
      // by Stripe; if order creation failed, support needs to refund manually.
      await redis.del(pendingKey).catch(() => {});
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const idempotencyKey = intent.metadata?.idempotencyKey;
      if (idempotencyKey) {
        await prisma.order.updateMany({
          where: { idempotencyKey, paymentStatus: 'UNPAID' },
          data: { paymentStatus: 'FAILED' },
        });
        // Clean up Redis even on failure so retries get a fresh slot.
        try {
          const { redis } = await import('@/lib/redis');
          await redis.del(`stripe:pending:${idempotencyKey}`);
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 });
  }
}
