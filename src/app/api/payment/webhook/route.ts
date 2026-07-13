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
  let loggedRowId: string | null = null;
  let eventType = 'unknown';
  let body = '';

  try {
    body = await req.text();
    try {
      const parsed = JSON.parse(body);
      eventType = parsed.type || 'unknown';
    } catch {
      // ignore
    }

    // Save initial webhook log
    const logRow = await prisma.webhookLog.create({
      data: {
        source: 'stripe',
        event: eventType,
        payload: body,
        status: 'pending',
      },
    });
    loggedRowId = logRow.id;

    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    let event: Stripe.Event;

    if (isProd && (!webhookSecret || !sig)) {
      console.error(
        '[stripe webhook] signature verification required in production but webhook secret or signature is missing'
      );
      if (loggedRowId) {
        await prisma.webhookLog.update({
          where: { id: loggedRowId },
          data: {
            status: 'error',
            statusCode: 400,
            errorMsg: 'Signature verification required in production',
          },
        });
      }
      return NextResponse.json({ message: 'Signature verification required' }, { status: 400 });
    }

    if (webhookSecret && sig) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
      });
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err: any) {
        console.error('[stripe webhook] signature verification failed:', err);
        if (loggedRowId) {
          await prisma.webhookLog.update({
            where: { id: loggedRowId },
            data: {
              status: 'error',
              statusCode: 400,
              errorMsg: `Construct event failed: ${err?.message}`,
            },
          });
        }
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Dev mode — parse raw body without verification
      event = JSON.parse(body) as Stripe.Event;
    }

    // Update event type with actual verified event type
    eventType = event.type;
    if (loggedRowId) {
      await prisma.webhookLog.update({
        where: { id: loggedRowId },
        data: { event: eventType },
      });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const idempotencyKey = intent.metadata?.idempotencyKey;
      if (!idempotencyKey) {
        console.warn('[stripe webhook] payment_intent.succeeded without idempotencyKey metadata');
        if (loggedRowId) {
          await prisma.webhookLog.update({
            where: { id: loggedRowId },
            data: {
              status: 'ignored',
              statusCode: 200,
              errorMsg: 'payment_intent.succeeded without idempotencyKey metadata',
            },
          });
        }
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Idempotency — skip if we've already finalized this intent.
      const existingOrder = await prisma.order.findFirst({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existingOrder) {
        if (loggedRowId) {
          await prisma.webhookLog.update({
            where: { id: loggedRowId },
            data: {
              status: 'ok',
              statusCode: 200,
              errorMsg: 'Already processed (idempotency key match)',
            },
          });
        }
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
        if (loggedRowId) {
          await prisma.webhookLog.update({
            where: { id: loggedRowId },
            data: {
              status: 'error',
              statusCode: 200,
              errorMsg: `Pending cart missing for idempotencyKey ${idempotencyKey}`,
            },
          });
        }
        return NextResponse.json({ received: true, missingPending: true }, { status: 200 });
      }

      const pending = JSON.parse(pendingRaw) as {
        userId: string;
        cartItems: Array<{ id: string; qty: number }>;
        addressId?: string;
        couponCode?: string;
        promoCode?: string;
        pointsRedeemed?: number;
      };

      // Use the session-less helper. Stripe webhooks come from Stripe's
      // servers and don't carry a user session; the userId in the pending
      // cart is our trust root after signature verification above.
      const result = await createOrderForUser(pending.userId, {
        items: pending.cartItems.map(c => ({ variantId: c.id, quantity: c.qty })),
        addressId: pending.addressId,
        paymentMethod: 'CREDIT_CARD',
        couponCode: pending.couponCode,
        promoCode: pending.promoCode,
        pointsRedeemed: pending.pointsRedeemed,
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
        if (loggedRowId) {
          await prisma.webhookLog.update({
            where: { id: loggedRowId },
            data: {
              status: 'error',
              statusCode: 200,
              errorMsg: `createOrder failed: ${result.error}`,
            },
          });
        }
        return NextResponse.json({ received: true, error: result.error }, { status: 200 });
      }

      // Clear the pending cache regardless — the user has already been charged
      // by Stripe; if order creation failed, support needs to refund manually.
      await redis.del(pendingKey).catch(() => {});
    } else if (event.type === 'payment_intent.payment_failed') {
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
    } else {
      // Ignored event
      if (loggedRowId) {
        await prisma.webhookLog.update({
          where: { id: loggedRowId },
          data: { status: 'ignored', statusCode: 200 },
        });
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (loggedRowId) {
      await prisma.webhookLog.update({
        where: { id: loggedRowId },
        data: { status: 'ok', statusCode: 200, processedAt: new Date() },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Webhook Error:', err.message);
    if (loggedRowId) {
      try {
        await prisma.webhookLog.update({
          where: { id: loggedRowId },
          data: {
            status: 'error',
            statusCode: 500,
            errorMsg: err.message,
            processedAt: new Date(),
          },
        });
      } catch {
        // ignore log error
      }
    }
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 });
  }
}
