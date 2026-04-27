import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrder } from '@/app/actions';

// This webhook endpoint receives Stripe confirmation events
// Set STRIPE_WEBHOOK_SECRET in .env to enable signature validation
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (webhookSecret && sig) {
      // Live mode: validate signature to prevent spoofed webhook calls
      const Stripe = (await import('stripe')).default;
      const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY as string);
      try {
        event = stripeInstance.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Dev mode: parse directly without validation
      event = JSON.parse(body);
    }

    // Handle payment success
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const { userId, idempotencyKey, addressSnapshot } = intent.metadata;

      // Check idempotency - has this already been processed?
      const existingOrder = await prisma.order.findFirst({
        where: { idempotencyKey }
      });

      if (existingOrder) {
        console.log(`Webhook already processed for key: ${idempotencyKey}`);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Create order atomically on confirmed payment
      console.log(`Payment confirmed for user ${userId}, creating order...`);
      // NOTE: cartItems are stored in the session/DB at checkout initiation
      // For a full implementation, cart items should be retrieved from Redis/DB here
      // For now, log the intent and let the frontend call createOrder after client-side confirmation
      console.log('Payment Intent ID:', intent.id, 'Idempotency key:', idempotencyKey);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      console.error(`Payment FAILED for intent: ${intent.id}`);
      // Could update a pending order to CANCELLED here
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 });
  }
}
