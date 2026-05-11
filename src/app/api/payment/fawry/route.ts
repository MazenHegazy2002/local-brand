import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VAT_RATE, getShippingRate } from '@/lib/constants';
import { SessionUser } from '@/types';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * Fawry Pay Egypt integration.
 * Generates a reference number that customers can use at any Fawry outlet,
 * mobile wallet, or online gateway to pay.
 *
 * Env vars required:
 *   FAWRY_MERCHANT_CODE
 *   FAWRY_SECURITY_KEY
 *   FAWRY_BASE_URL (defaults to https://www.atfawry.com)
 */

const fawrySchema = z.object({
  cartItems: z.array(z.object({
    id: z.string(),
    qty: z.number().int().positive(),
  })).min(1),
  addressInfo: z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    governorate: z.string().optional(),
  }).optional(),
  couponId: z.string().optional(),
});

function fawrySignature(parts: string[], securityKey: string): string {
  return crypto.createHash('sha256').update(parts.join('') + securityKey).digest('hex');
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = fawrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { cartItems, addressInfo, couponId } = parsed.data;
    const userId = (session.user as SessionUser).id;

    // Server-side total computation
    let subtotal = 0;
    const chargeItems: Array<{ itemId: string; description: string; price: number; quantity: number }> = [];
    for (const item of cartItems) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
        include: { product: true },
      });
      if (!variant) continue;
      const price = variant.price || variant.product.basePrice;
      subtotal += price * item.qty;
      chargeItems.push({
        itemId: variant.id,
        description: variant.product.title.slice(0, 50),
        price,
        quantity: item.qty,
      });
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
    const amount = Math.max(0, subtotal - discount + vat + shipping);

    const merchantCode = process.env.FAWRY_MERCHANT_CODE;
    const securityKey = process.env.FAWRY_SECURITY_KEY;
    if (!merchantCode || !securityKey) {
      return NextResponse.json(
        {
          mockMode: true,
          message: 'Fawry credentials not set. Showing a mock reference.',
          fawryRefNumber: `MOCK-${Date.now()}`,
          amount: amount.toFixed(2),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        },
        { status: 200 }
      );
    }

    const merchantRefNumber = `${userId}-${Date.now()}`;
    const customerProfileId = userId;
    const paymentExpiry = Date.now() + 48 * 60 * 60 * 1000; // 48h

    // Signature per Fawry spec (simplified charge request)
    const sig = fawrySignature(
      [
        merchantCode,
        merchantRefNumber,
        customerProfileId,
        amount.toFixed(2),
      ],
      securityKey
    );

    const base = process.env.FAWRY_BASE_URL || 'https://www.atfawry.com';
    const fawryRes = await fetch(`${base}/ECommerceWeb/Fawry/payments/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantCode,
        merchantRefNum: merchantRefNumber,
        customerProfileId,
        paymentMethod: 'PAYATFAWRY',
        amount: amount.toFixed(2),
        currencyCode: 'EGP',
        description: `Brandy order ${merchantRefNumber}`,
        chargeItems,
        paymentExpiry,
        signature: sig,
      }),
    });

    if (!fawryRes.ok) {
      const errText = await fawryRes.text();
      console.error('[fawry] API error:', errText);
      return NextResponse.json(
        { message: 'Fawry payment creation failed' },
        { status: 502 }
      );
    }

    const data = (await fawryRes.json()) as {
      referenceNumber?: string;
      statusCode?: number;
      statusDescription?: string;
      expirationTime?: string;
    };

    if (data.statusCode && data.statusCode !== 200) {
      return NextResponse.json(
        { message: data.statusDescription || 'Fawry rejected the transaction' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      fawryRefNumber: data.referenceNumber,
      amount: amount.toFixed(2),
      expiresAt: data.expirationTime || new Date(paymentExpiry).toISOString(),
      message: 'Use this reference at any Fawry outlet or via mobile wallet within 48 hours.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[fawry] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Fawry request failed' },
      { status: 500 }
    );
  }
}
