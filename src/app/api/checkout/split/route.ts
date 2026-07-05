import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  VAT_RATE,
  getShippingRate,
  DEFAULT_COMMISSION_RATE,
  MAX_DISCOUNT_PCT,
} from '@/lib/constants';
import { SessionUser } from '@/types';
import { createOrderSchema } from '@/lib/validation';
import { OrderStatus, PaymentStatus, OrderItemStatus, DiscountType } from '@/generated/client';

/**
 * Multi-seller cart checkout — splits 1 cart into N sub-orders (1 per seller)
 * POST /api/checkout/split
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;
    const body = await req.json();

    // ── 1. Validate Input ─────────────────────────────────────────────────────
    const validated = createOrderSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          message: 'Invalid input',
          errors: validated.error.errors,
        },
        { status: 400 }
      );
    }

    const { items: cartItemsInput, addressId, couponCode, paymentMethod } = validated.data;

    // ── 1b. Resolve coupon ──────────────────────────────────────────────────────
    let coupon: {
      id: string;
      discountType: string;
      discountValue: number;
      maxDiscount: number | null;
    } | null = null;
    if (couponCode) {
      const dbCoupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (dbCoupon && dbCoupon.isActive && dbCoupon.expiryDate > new Date()) {
        coupon = {
          id: dbCoupon.id,
          discountType: dbCoupon.discountType,
          discountValue: dbCoupon.discountValue,
          maxDiscount: dbCoupon.maxDiscount,
        };
      }
    }

    // ── 2. Group cart items by seller ─────────────────────────────────────────
    // We need to fetch product info to know the seller
    const sellerGroups: Record<
      string,
      {
        items: {
          variantId: string;
          quantity: number;
          price: number;
          title: string;
          sellerName: string;
        }[];
        governorate: string;
      }
    > = {};

    // Get user's address for shipping calculation
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) return NextResponse.json({ message: 'Address not found' }, { status: 400 });

    for (const itemInput of cartItemsInput) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: itemInput.variantId },
        include: {
          product: {
            include: { seller: true },
          },
        },
      });

      if (!variant) throw new Error(`Product variant ${itemInput.variantId} not found`);
      if (variant.stockCount < itemInput.quantity) {
        throw new Error(`${variant.product.title} is out of stock`);
      }

      const sellerId = variant.product.sellerId;
      if (!sellerGroups[sellerId]) {
        sellerGroups[sellerId] = { items: [], governorate: address.governorate };
      }

      sellerGroups[sellerId].items.push({
        variantId: variant.id,
        quantity: itemInput.quantity,
        price: variant.price || variant.product.basePrice,
        title: variant.product.title,
        sellerName: variant.product.seller.storeName,
      });
    }

    // ── 3. Execute Split Checkout in a Transaction ───────────────────────────
    const result = await prisma.$transaction(async tx => {
      const createdOrders = [];

      for (const [sellerId, group] of Object.entries(sellerGroups)) {
        let subtotal = 0;
        const orderItemsData = [];

        for (const item of group.items) {
          // Atomic stock decrement
          const updated = await tx.productVariant.updateMany({
            where: { id: item.variantId, stockCount: { gte: item.quantity } },
            data: { stockCount: { decrement: item.quantity } },
          });

          if (updated.count === 0) {
            throw new Error(`Concurrency error: ${item.title} just sold out`);
          }

          subtotal += item.price * item.quantity;

          orderItemsData.push({
            variantId: item.variantId,
            productTitleSnapshot: item.title,
            sellerNameSnapshot: item.sellerName,
            priceAtPurchase: item.price,
            quantity: item.quantity,
            status: OrderItemStatus.PENDING,
          });
        }

        const vatAmount = subtotal * VAT_RATE;
        const shippingFee = getShippingRate(group.governorate);

        let discountAmount = 0;
        if (coupon) {
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = subtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          } else {
            discountAmount = coupon.discountValue;
          }
          discountAmount = Math.min(discountAmount, subtotal * MAX_DISCOUNT_PCT);
        }

        const totalAmount = Math.max(0, subtotal + vatAmount + shippingFee - discountAmount);

        // Platform fee calculation
        const platformFee = subtotal * DEFAULT_COMMISSION_RATE;
        const sellerPayoutTotal = subtotal - platformFee;

        const order = await tx.order.create({
          data: {
            userId,
            totalAmount,
            discountAmount,
            shippingFee,
            platformFee,
            sellerPayoutTotal,
            paymentMethod: paymentMethod as any,
            paymentStatus: PaymentStatus.UNPAID,
            status: OrderStatus.PENDING_PAYMENT,
            shippingAddressSnapshot: JSON.stringify(address),
            couponId: coupon?.id,
            items: { create: orderItemsData },
          },
        });

        createdOrders.push({
          orderId: order.id,
          sellerId,
          subtotal,
          totalAmount,
        });
      }

      // ── 4. Award loyalty points ─────────────────────────────────────────────
      const totalSpent = createdOrders.reduce((sum, o) => sum + o.subtotal, 0);
      const pointsEarned = Math.floor(totalSpent);

      await tx.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });

      // ── 5. Track coupon usage ───────────────────────────────────────────────
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: createdOrders.length } },
        });
        for (const o of createdOrders) {
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId,
              orderId: o.orderId,
              discount: o.subtotal > 0 ? o.totalAmount - o.subtotal : 0,
            },
          });
        }
      }

      return { createdOrders, pointsEarned };
    });

    return NextResponse.json(
      {
        message: `Checkout initiated. ${result.createdOrders.length} sub-order(s) created.`,
        orders: result.createdOrders,
        loyaltyPoints: {
          earned: result.pointsEarned,
          message: `+${result.pointsEarned} loyalty points pending!`,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Split Checkout Error:', error);
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
