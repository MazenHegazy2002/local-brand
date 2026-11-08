import { NextResponse } from 'next/server';
import { FREE_SHIPPING_THRESHOLD, getShippingRate } from '@/lib/shipping-rates';
import { getSetting } from '@/lib/admin-settings-registry';
import { getVatRate } from '@/lib/vat';
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
    const cartItems: Array<{ id?: string; qty?: number; quantity?: number }> = Array.isArray(
      body?.cartItems
    )
      ? body.cartItems
      : [];

    // One Egypt Post parcel per seller, priced from the seller's governorate.
    const { resolveCartShipping } = await import('@/lib/shipping-helper');
    const quote = cartItems.length
      ? await resolveCartShipping(
          governorate,
          cartItems.map(i => ({ id: i.id, quantity: i.qty ?? i.quantity ?? 1 }))
        )
      : {
          fee: getShippingRate(
            governorate,
            typeof body?.originGovernorate === 'string' ? body.originGovernorate : 'cairo',
            typeof body?.weightGrams === 'number' && body.weightGrams > 0 ? body.weightGrams : 1000
          ),
          weightGrams: typeof body?.weightGrams === 'number' ? body.weightGrams : 1000,
        };
    let shippingCost = quote.fee;
    const totalWeightGrams = quote.weightGrams;

    // Free shipping follows the same admin settings as order creation.
    const subtotal: number | undefined =
      typeof body?.subtotal === 'number' ? body.subtotal : undefined;
    let freeShippingApplied = false;
    let freeShippingThreshold = FREE_SHIPPING_THRESHOLD;
    try {
      const enabled = await getSetting<boolean>('FREE_SHIPPING_ENABLED');
      freeShippingThreshold = await getSetting<number>('FREE_SHIPPING_THRESHOLD');
      if (enabled && typeof subtotal === 'number' && subtotal >= freeShippingThreshold) {
        shippingCost = 0;
        freeShippingApplied = true;
      }
    } catch {
      /* keep the fee */
    }
    const vatRate = await getVatRate();

    const estimatedDays = FAST_GOVERNORATES.has(governorate) ? '1-3' : '3-5';

    return NextResponse.json(
      {
        shippingCost,
        currency: 'EGP',
        estimatedDelivery: `${estimatedDays} business days`,
        courier: 'Egypt Post (البريد المصري)',
        weightGrams: totalWeightGrams,
        freeShippingApplied,
        freeShippingThreshold,
        vatRate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[shipping/calculate] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
