import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrder } from '@/app/actions/orders';

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
      const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2026-03-25.dahlia' as any,
      });
      try {
        event = stripeInstance.webhooks.constructEvent(body, sig, webhookSecret);
      } catch {
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
        const addressInfo = typeof addressSnapshot === 'string' ? JSON.parse(addressSnapshot) : addressSnapshot;
        await createOrder(
          cartItems,
          addressInfo,
          'CREDIT_CARD',
          null,
          undefined
        );
        await redis.del(cartKey);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      // Update pending order to FAILED status
      const intent = event.data.object;
      const { userId, idempotencyKey } = intent.metadata;
      if (idempotencyKey) {
        await prisma.order.updateMany({
          where: { idempotencyKey, paymentStatus: 'UNPAID' },
          data: { paymentStatus: 'FAILED' },
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch {
    return NextResponse.json({ message: 'Webhook handler failed' }, { status: 500 });
  }
}
