import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShippingRate } from '@/lib/constants';
import {
  WEIGHT_SURCHARGE_THRESHOLD,
  WEIGHT_SURCHARGE_PER_500G,
  FREE_SHIPPING_THRESHOLD,
} from '@/lib/shipping-rates';
import { shippingCalculateSchema } from '@/lib/validation';

// Single source of truth for shipping rates — `getShippingRate(governorate)`
// from constants pulls from `lib/shipping-rates.ts`. The previous version of
// this route had its own hard-coded table that drifted from that file (it had
// extra "cities" that aren't governorates and missed several real ones), so
// the cart's "estimated shipping" preview disagreed with `createOrder`.
function calculateShippingCost(governorate: string, weightGrams: number): number {
  const baseRate = getShippingRate(governorate);
  // Heavier-than-threshold parcels add a per-500g surcharge.
  const overflow = Math.max(0, weightGrams - WEIGHT_SURCHARGE_THRESHOLD);
  const weightSurcharge = Math.ceil(overflow / 500) * WEIGHT_SURCHARGE_PER_500G;
  return baseRate + weightSurcharge;
}

const FAST_GOVERNORATES = new Set(['Cairo', 'Giza', 'Alexandria']);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = shippingCalculateSchema.safeParse({
      governorate: body?.governorate,
      items: Array.isArray(body?.cartItems)
        ? body.cartItems.map((c: { qty?: number; quantity?: number; weightGrams?: number }) => ({
            quantity: c.qty ?? c.quantity ?? 1,
            weightGrams: c.weightGrams ?? 0,
          }))
        : undefined,
      weightGrams: body?.weightGrams,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { governorate } = parsed.data;
    const cartItems: Array<{ id?: string; qty?: number; quantity?: number }> = Array.isArray(
      body?.cartItems
    )
      ? body.cartItems
      : [];

    let totalWeightGrams = 0;
    for (const item of cartItems) {
      const qty = item.qty ?? item.quantity ?? 1;
      let perUnitGrams = 500; // sensible fallback
      if (item.id) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          select: { weightGrams: true },
        });
        if (product?.weightGrams) perUnitGrams = product.weightGrams;
      }
      totalWeightGrams += perUnitGrams * qty;
    }

    let shippingCost = calculateShippingCost(governorate, totalWeightGrams);

    // Subtotal-based free shipping (when caller passed a subtotal).
    const subtotal: number | undefined =
      typeof body?.subtotal === 'number' ? body.subtotal : undefined;
    let freeShippingApplied = false;
    if (typeof subtotal === 'number' && subtotal >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
      freeShippingApplied = true;
    }

    const estimatedDays = FAST_GOVERNORATES.has(governorate) ? '1-2' : '3-5';

    return NextResponse.json(
      {
        shippingCost,
        currency: 'EGP',
        estimatedDelivery: `${estimatedDays} business days`,
        courier: 'Aramex Egypt',
        weightGrams: totalWeightGrams,
        freeShippingApplied,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[shipping/calculate] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
