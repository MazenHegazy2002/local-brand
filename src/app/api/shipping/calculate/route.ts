import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveShippingRate } from '@/lib/shipping-helper';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping-rates';
import { shippingCalculateSchema } from '@/lib/validation';

const FAST_GOVERNORATES = new Set(['Cairo', 'Giza', 'Qalyubia', 'Alexandria']);

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
    const originGovernorate = typeof body?.originGovernorate === 'string' ? body.originGovernorate : 'cairo';
    const cartItems: Array<{ id?: string; qty?: number; quantity?: number }> = Array.isArray(
      body?.cartItems
    )
      ? body.cartItems
      : [];

    let totalWeightGrams = typeof body?.weightGrams === 'number' ? body.weightGrams : 0;
    if (cartItems.length > 0) {
      let itemWeightSum = 0;
      for (const item of cartItems) {
        const qty = item.qty ?? item.quantity ?? 1;
        let perUnitGrams = 500; // sensible fallback for 0.5kg item
        if (item.id) {
          const product = await prisma.product.findUnique({
            where: { id: item.id },
            select: { weightGrams: true },
          });
          if (product?.weightGrams) perUnitGrams = product.weightGrams;
        }
        itemWeightSum += perUnitGrams * qty;
      }
      totalWeightGrams = itemWeightSum;
    }

    if (totalWeightGrams <= 0) {
      totalWeightGrams = 1000; // default 1 kg
    }

    let shippingCost = await resolveShippingRate(governorate, originGovernorate, totalWeightGrams);

    // Subtotal-based free shipping (when caller passed a subtotal).
    const subtotal: number | undefined =
      typeof body?.subtotal === 'number' ? body.subtotal : undefined;
    let freeShippingApplied = false;
    if (typeof subtotal === 'number' && subtotal >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
      freeShippingApplied = true;
    }

    const estimatedDays = FAST_GOVERNORATES.has(governorate) ? '1-3' : '3-5';

    return NextResponse.json(
      {
        shippingCost,
        currency: 'EGP',
        estimatedDelivery: `${estimatedDays} business days`,
        courier: 'Egypt Post (البريد المصري)',
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
