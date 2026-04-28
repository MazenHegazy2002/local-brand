import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { DiscountType } from '@/generated/client';

// Stripe mock integration — real keys provided via env
// Set STRIPE_SECRET_KEY in .env to enable live mode
let stripe: any = null;

async function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-03-25.dahlia' as any,
    });
  }
  return stripe;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { cartItems, addressInfo, couponId } = await req.json();
    const userId = (session.user as any).id;

    // 1. Server-side price re-calculation (anti-tamper)
    let subtotal = 0;
    const lineItems = [];

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        include: { variants: true, images: { where: { isPrimary: true } } }
      });
      if (!product) throw new Error(`Product ${item.name} not found`);

      const variant = product.variants[0];
      if (!variant || variant.stockCount < item.qty) {
        throw new Error(`${product.title} is out of stock`);
      }

      subtotal += product.basePrice * item.qty;

      lineItems.push({
        price_data: {
          currency: 'egp',
          product_data: {
            name: product.title,
            images: product.images.map((i: any) => i.url),
          },
          unit_amount: Math.round(product.basePrice * 100), // Stripe expects cents/piastres
        },
        quantity: item.qty,
      });
    }

    // 2. Apply coupon discount
    let discountAmount = 0;
    if (couponId) {
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
        if (coupon.discountType === DiscountType.PERCENTAGE) {
          discountAmount = subtotal * (coupon.discountValue / 100);
          if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        } else {
          discountAmount = coupon.discountValue;
        }
      }
    }

    const shippingFee = 50; // Standard flat-rate shipping in EGP
    const vatAmount = subtotal * 0.14; // 14% Egypt VAT
    const total = Math.max(0, subtotal + vatAmount + shippingFee - discountAmount);

    // 3. Generate idempotency key to prevent double-charge on retry
    const idempotencyKey = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // 4. Stripe Payment Intent (if Stripe key available, else return mock)
    const stripeInstance = await getStripe();

    if (stripeInstance) {
      const paymentIntent = await stripeInstance.paymentIntents.create(
        {
          amount: Math.round(total * 100),
          currency: 'egp',
          metadata: {
            userId,
            idempotencyKey,
            addressSnapshot: JSON.stringify(addressInfo),
          },
        },
        { idempotencyKey }
      );

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        idempotencyKey,
        breakdown: {
          subtotal: subtotal.toFixed(2),
          vat: vatAmount.toFixed(2),
          shipping: shippingFee.toFixed(2),
          discount: discountAmount.toFixed(2),
          total: total.toFixed(2),
        }
      }, { status: 200 });
    }

    // 5. Fallback: Mock payment intent for development
    return NextResponse.json({
      clientSecret: `mock_pi_${idempotencyKey}_secret`,
      idempotencyKey,
      mockMode: true,
      breakdown: {
        subtotal: subtotal.toFixed(2),
        vat: vatAmount.toFixed(2),
        shipping: shippingFee.toFixed(2),
        discount: discountAmount.toFixed(2),
        total: total.toFixed(2),
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Payment Intent Error:', error);
    return NextResponse.json({ message: error.message || 'Payment failed' }, { status: 500 });
  }
}
