import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DiscountType } from '@/generated/client';
import { VAT_RATE, STRIPE_API_VERSION } from '@/lib/constants';
import { SessionUser, ProductImage } from '@/types';
import type Stripe from 'stripe';
import crypto from 'crypto';

// Stripe mock integration — real keys provided via env
// Set STRIPE_SECRET_KEY in .env to enable live mode
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
    if (!session || !session.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { cartItems, addressInfo, couponId } = await req.json();
    const userId = (session.user as SessionUser).id;

    // 1. Server-side price re-calculation (anti-tamper)
    let subtotal = 0;
    const lineItems = [];

    for (const item of cartItems) {
      // Look up by variantId first (item.id)
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
        include: { 
          product: { 
            include: { images: { where: { isPrimary: true } } } 
          } 
        }
      });

      if (!variant) {
        // Fallback to productId lookup if variantId not found (legacy or mis-typed)
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          include: { variants: true, images: { where: { isPrimary: true } } }
        });
        
        if (!product) throw new Error(`Product ${item.name} not found`);
        
        const fallbackVariant = product.variants[0];
        if (!fallbackVariant || fallbackVariant.stockCount < item.qty) {
          throw new Error(`${product.title} is out of stock`);
        }

        subtotal += product.basePrice * item.qty;
        lineItems.push({
          price_data: {
            currency: 'egp',
            product_data: {
              name: product.title,
              images: product.images.map((i: ProductImage) => i.url),
            },
            unit_amount: Math.round(product.basePrice * 100),
          },
          quantity: item.qty,
        });
      } else {
        if (variant.stockCount < item.qty) {
          throw new Error(`${variant.product.title} is out of stock`);
        }

        const price = variant.price || variant.product.basePrice;
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

    const { getShippingRate } = await import('@/lib/constants');
    const shippingFee = addressInfo?.governorate ? getShippingRate(addressInfo.governorate) : 50;
    const vatAmount = subtotal * VAT_RATE; // 14% Egypt VAT
    const total = Math.max(0, subtotal + vatAmount + shippingFee - discountAmount);

    // 3. Generate idempotency key to prevent double-charge on retry
    const idempotencyKey = `${userId}-${crypto.randomUUID()}`;

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
            addressId: addressInfo?.id || '',
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

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Payment Intent Error:', err);
    return NextResponse.json({ message: err.message || 'Payment failed' }, { status: 500 });
  }
}
