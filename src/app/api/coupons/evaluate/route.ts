import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { couponEvaluateSchema } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = couponEvaluateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: validated.error.format() },
        { status: 400 }
      );
    }

    const { code } = validated.data;
    let cartTotal = validated.data.orderValue;

    if (validated.data.items && validated.data.items.length > 0) {
      let computedTotal = 0;
      for (const item of validated.data.items) {
        const dbVariant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (dbVariant) {
          const price = dbVariant.price || dbVariant.product.basePrice;
          computedTotal += price * item.quantity;
        }
      }
      cartTotal = computedTotal;
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ message: 'Invalid coupon code' }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ message: 'This coupon is no longer active' }, { status: 400 });
    }

    if (coupon.expiryDate < new Date()) {
      return NextResponse.json({ message: 'This coupon has expired' }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ message: 'Coupon usage limit reached' }, { status: 400 });
    }

    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
      return NextResponse.json(
        { message: `Cart subtotal must be at least EGP ${coupon.minOrderValue}` },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = cartTotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    // Ensure we don't discount more than the cart total
    discountAmount = Math.min(discountAmount, cartTotal);

    return NextResponse.json(
      {
        message: 'Coupon applied successfully',
        discountAmount,
        couponId: coupon.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Coupon Evaluation Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
