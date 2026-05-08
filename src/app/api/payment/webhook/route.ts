import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';

// This webhook endpoint receives Stripe confirmation events
// Set STRIPE_WEBHOOK_SECRET in .env to enable signature validation
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      // Live mode: validate signature to prevent spoofed webhook calls
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
      });
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch {
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Dev mode: parse directly without validation
      event = JSON.parse(body) as Stripe.Event;
    }

    // Handle payment success
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { userId, idempotencyKey, addressSnapshot } = intent.metadata;

      // Check idempotency - has this already been processed?
      const existingOrder = await prisma.order.findFirst({
        where: { idempotencyKey }
      });

      if (existingOrder) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // NOTE: cartItems are stored in Redis at checkout initiation (key: cart:{userId})
      // Retrieve and create order atomically
      const { redis } = await import('@/lib/redis');
      const cartKey = `cart:${userId}`;
      const cartData = await redis.get(cartKey);
      
      if (cartData) {
        const cartItems = JSON.parse(cartData);
        const { createOrder } = await import('@/app/actions/orders');
        const result = await createOrder({
          items: cartItems,
          addressId: intent.metadata.addressId,
          paymentMethod: 'CREDIT_CARD',
          guestEmail: intent.metadata.guestEmail,
          couponCode: intent.metadata.couponCode
        });

        if (result.success && result.orderId) {
          await prisma.order.update({
            where: { id: result.orderId },
            data: { 
              paymentStatus: 'PAID', 
              paymentId: intent.id, 
              status: 'CONFIRMED',
              idempotencyKey // Ensure idempotencyKey is set on the created order
            }
          });
        }
        await redis.del(cartKey);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      // Update pending order to FAILED status
      const intent = event.data.object as Stripe.PaymentIntent;
      const { userId, idempotencyKey } = intent.metadata;
      if (idempotencyKey) {
        await prisma.order.updateMany({
          where: { idempotencyKey, paymentStatus: 'UNPAID' },
          data: { paymentStatus: 'FAILED' },
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 });
  }
}
