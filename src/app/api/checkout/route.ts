import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { createOrderForUser } from '@/lib/order-creator';

// Mobile checkout. The app's bag stores productId + color/size, so resolve the
// variant here, then hand off to the same order creator the web uses.
// ponytail: COD + manual transfers only — PaySky/Fawry need the cached-pending +
// callback flow wired for mobile before they can be offered here.
const METHODS = {
  cod: 'CASH_ON_DELIVERY',
  instapay: 'INSTAPAY',
  vodafone_cash: 'VODAFONE_CASH',
} as const;
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const items: { productId: string; qty: number; size?: string; color?: string }[] =
    body?.items ?? [];
  if (!items.length) return NextResponse.json({ error: 'Your bag is empty' }, { status: 400 });
  const paymentMethod = METHODS[body.paymentMethod as keyof typeof METHODS];
  if (!paymentMethod) {
    return NextResponse.json(
      {
        error: 'Card and Fawry payments are coming soon in the app. Please choose another method.',
      },
      { status: 400 }
    );
  }
  const manual = paymentMethod !== 'CASH_ON_DELIVERY';
  const sender = String(body.paymentSenderDetail ?? '')
    .trim()
    .slice(0, 100);
  const reference = String(body.paymentReference ?? '')
    .trim()
    .slice(0, 100);
  const receipt = typeof body.paymentReceiptUrl === 'string' ? body.paymentReceiptUrl : '';
  if (manual && (!sender || !receipt)) {
    return NextResponse.json(
      { error: 'Enter the number you paid from and upload the transfer receipt.' },
      { status: 400 }
    );
  }

  if (body.addressId) {
    const owned = await prisma.address.findFirst({
      where: { id: body.addressId, userId: user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: items.map(i => i.productId) }, product: { published: true } },
    select: { id: true, productId: true, attributes: true },
  });

  const orderItems = [];
  for (const i of items) {
    const options = variants.filter(v => v.productId === i.productId);
    const byColor = options.find(v => {
      try {
        const color = JSON.parse(v.attributes ?? '{}').color;
        return i.color && String(color).toLowerCase() === i.color.toLowerCase();
      } catch {
        return false;
      }
    });
    const variant = byColor ?? options[0];
    if (!variant) {
      return NextResponse.json(
        { error: 'An item in your bag is no longer available' },
        { status: 409 }
      );
    }
    orderItems.push({
      variantId: variant.id,
      quantity: i.qty,
      selectedSize: i.size || undefined,
      selectedColor: i.color || undefined,
    });
  }

  const result = await createOrderForUser(user.id, {
    addressId: body.addressId,
    paymentMethod,
    paymentSenderDetail: manual ? sender : undefined,
    paymentReference: manual ? reference || undefined : undefined,
    paymentReceiptUrl: manual ? receipt : undefined,
    items: orderItems,
    couponCode: typeof body.couponCode === 'string' ? body.couponCode : undefined,
    promoCode: typeof body.promoCode === 'string' ? body.promoCode : undefined,
  });
  if (result.error || !result.orderId) {
    return NextResponse.json({ error: result.error ?? 'Could not place order' }, { status: 400 });
  }
  return NextResponse.json({ orderId: result.orderId });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
