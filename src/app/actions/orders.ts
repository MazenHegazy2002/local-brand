'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  OrderStatus,
  OrderItemStatus,
  DiscountType,
  PaymentStatus,
  PaymentMethod,
} from '@/generated/client';
import type { SessionUser } from '@/types';
import { VAT_RATE, getShippingRate } from '@/lib/constants';
import { createOrderSchema } from '@/lib/validation';

export async function createOrder(
  formData: unknown
): Promise<{ success?: boolean; orderId?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session ? (session.user as SessionUser).id : null;

    // ── 1. Validate Input ─────────────────────────────────────────────────────
    const validated = createOrderSchema.safeParse(formData);
    if (!validated.success) {
      return { error: 'Invalid input data' };
    }

    const {
      items: cartItemsInput,
      addressId,
      guestEmail,
      shippingAddress,
      couponCode,
      paymentMethod,
      orderNotes,
      giftWrapping,
    } = validated.data;

    if (!userId && !guestEmail) {
      return { error: 'Unauthorized. Please log in or provide guest email.' };
    }

    // ── 2. Resolve shipping address ───────────────────────────────────────────
    // Either an existing saved address or an inline one supplied by the form.
    const address = addressId
      ? await prisma.address.findUnique({ where: { id: addressId } })
      : null;

    if (addressId && !address) return { error: 'Address not found' };

    // We need *some* address info to ship the order to.
    const resolvedAddress = address
      ? {
          fullName: undefined as string | undefined,
          phone: undefined as string | undefined,
          street: address.street,
          city: address.city,
          governorate: address.governorate,
          postalCode: address.postalCode || undefined,
          country: address.country,
        }
      : shippingAddress
        ? { ...shippingAddress }
        : null;

    if (!resolvedAddress) {
      return { error: 'A shipping address is required to place an order.' };
    }

    // Persist the guest contact email inside the address snapshot too, so
    // admin/seller views that already render the snapshot pick it up for free.
    const addressSnapshot = userId ? resolvedAddress : { ...resolvedAddress, email: guestEmail };

    let subtotal = 0;
    const orderItemsData: {
      variantId: string;
      productTitleSnapshot: string;
      sellerNameSnapshot: string;
      priceAtPurchase: number;
      quantity: number;
      status: OrderItemStatus;
    }[] = [];

    for (const itemInput of cartItemsInput) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: itemInput.variantId },
        include: { product: { include: { seller: true } } },
      });

      if (!variant) {
        return {
          error:
            'One or more items in your cart are no longer available. Please refresh your cart and try again.',
        };
      }
      if (variant.stockCount < itemInput.quantity) {
        return { error: `Out of stock: ${variant.product.title}` };
      }

      const price = variant.price || variant.product.basePrice;
      subtotal += price * itemInput.quantity;

      orderItemsData.push({
        variantId: variant.id,
        productTitleSnapshot: variant.product.title,
        sellerNameSnapshot: variant.product.seller.storeName,
        priceAtPurchase: price,
        quantity: itemInput.quantity,
        status: OrderItemStatus.PENDING,
      });
    }

    // ── 3. Apply Coupon ───────────────────────────────────────────────────────
    let discountAmount = 0;
    let couponId = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
        const canUse = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
        const minMet = !coupon.minOrderValue || subtotal >= coupon.minOrderValue;

        if (canUse && minMet) {
          couponId = coupon.id;
          if (coupon.discountType === DiscountType.PERCENTAGE) {
            discountAmount = subtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
          }
        }
      }
    }

    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const vatAmount = subtotalAfterDiscount * VAT_RATE;
    const shippingFee = getShippingRate(resolvedAddress.governorate);
    const finalTotal = subtotalAfterDiscount + vatAmount + shippingFee;

    // ── 4. Execute Transaction ───────────────────────────────────────────────
    const order = await prisma.$transaction(async tx => {
      // Stock decrement
      for (const item of cartItemsInput) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockCount: { gte: item.quantity } },
          data: { stockCount: { decrement: item.quantity } },
        });
        if (updated.count === 0) throw new Error(`Stock error for variant ${item.variantId}`);
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          guestEmail: userId ? null : guestEmail,
          couponId,
          totalAmount: finalTotal,
          discountAmount,
          shippingFee,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.UNPAID,
          status: OrderStatus.PENDING_PAYMENT,
          shippingAddressSnapshot: JSON.stringify(addressSnapshot),
          orderNotes: orderNotes || null,
          giftWrapping: giftWrapping || false,
          items: { create: orderItemsData },
        },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // ── 5. Post-Order Actions ────────────────────────────────────────────────
    if (userId) {
      // Award the flat 10-points-per-order bonus. This is intentionally awaited
      // so the user sees their balance change immediately on the next page.
      try {
        const loyaltyMod = await import('./loyalty');
        await loyaltyMod.addLoyaltyPoints(userId, subtotal);
      } catch (err) {
        console.error('Failed to award loyalty points:', err);
      }
    }

    // Order confirmation email — fires for logged-in users (via their saved
    // email) AND for guests (via the email captured at checkout). Best-effort:
    // failures here must never block the order, so we don't await the chain.
    (async () => {
      try {
        const m = await import('@/lib/email');
        const orderWithItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!orderWithItems) return;

        if (userId) {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user?.email) {
            await m.sendEmail({
              to: user.email,
              subject: `Order Confirmation - ${order.id.slice(0, 8)}`,
              html: m.generateOrderConfirmationEmail(orderWithItems, user),
            });
          }
        } else if (guestEmail) {
          // Generate the same confirmation template; the helper accepts a
          // null user and falls back to "Customer" for the greeting.
          await m.sendEmail({
            to: guestEmail,
            subject: `Order Confirmation - ${order.id.slice(0, 8)}`,
            html: m.generateOrderConfirmationEmail(orderWithItems, null),
          });
        }
      } catch (err) {
        console.error('Order confirmation email failed:', err);
      }
    })();

    revalidatePath('/dashboard');
    return { success: true, orderId: order.id };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Create Order Action Error:', err);
    return { error: err.message || 'Failed to create order' };
  }
}

export async function cancelOrder(orderId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session ? (session.user as SessionUser).id : null;
    if (!userId) return { error: 'Unauthorized' };

    const order = await prisma.order.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) return { error: 'Order not found' };
    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING
    ) {
      return { error: 'Order cannot be cancelled at this stage' };
    }

    await prisma.$transaction(async tx => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      await tx.orderItem.updateMany({
        where: { orderId },
        data: { status: OrderItemStatus.CANCELLED },
      });
      // Optionally refund wallet or process payment refund if paid
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || 'Failed to cancel order' };
  }
}

export async function requestReturn(
  orderItemId: string,
  reason: string,
  details?: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session ? (session.user as SessionUser).id : null;
    if (!userId) return { error: 'Unauthorized' };

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!orderItem || orderItem.order?.userId !== userId) {
      return { error: 'Order item not found' };
    }

    if (orderItem.status !== OrderItemStatus.DELIVERED) {
      return { error: 'Item must be delivered to request a return' };
    }

    await prisma.$transaction(async tx => {
      await tx.returnRequest.create({
        data: {
          orderItemId,
          reason,
          details,
        },
      });

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: OrderItemStatus.RETURN_REQUESTED },
      });
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || 'Failed to request return' };
  }
}
