'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OrderStatus, OrderItemStatus, DiscountType } from '@/generated/client';
import type { Order, User, Address } from '@/types';
import { VAT_RATE } from '@/lib/constants';

interface CartItemInput {
  id: string;
  name: string;
  variantId?: string;
  qty: number;
}

interface AddressInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
}

export async function createOrder(
  cartItems: CartItemInput[],
  addressInfo: AddressInfo,
  paymentMethod: string,
  couponId?: string | null,
  guestEmail?: string
): Promise<{ success?: boolean; orderId?: string; error?: string }> {
  let userId: string | null = null;
  let isGuest = false;

  const session = await getServerSession(authOptions);
  if (session) {
    userId = (session.user as any).id;
  } else if (guestEmail) {
    isGuest = true;
  } else {
    throw new Error("Unauthorized. Please log in to checkout.");
  }

  let totalAmount = 0;
  let discountAmount = 0;
  const orderItemsData: {
    variantId: string;
    productTitleSnapshot: string;
    sellerNameSnapshot: string;
    priceAtPurchase: number;
    quantity: number;
    status: OrderItemStatus;
  }[] = [];

  // Initial subtotal calculation
  for (const item of cartItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.id },
      include: { variants: true, seller: true }
    });
    
    if (!product) throw new Error(`Product ${item.name} not found`);
    
    const variant = item.variantId ? product.variants.find(v => v.id === item.variantId) : product.variants[0];
    if (!variant) throw new Error(`No variant found for ${product.title}`);

    if (variant.stockCount < item.qty) {
      throw new Error(`Out of stock: ${product.title} only has ${variant.stockCount} remaining.`);
    }

    const price = variant.price || product.basePrice;
    totalAmount += price * item.qty;

    orderItemsData.push({
      variantId: variant.id,
      productTitleSnapshot: product.title,
      sellerNameSnapshot: product.seller.storeName,
      priceAtPurchase: price,
      quantity: item.qty,
      status: OrderItemStatus.PENDING
    });
  }

  // Apply coupon discount
  if (couponId && totalAmount > 0) {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (coupon && coupon.isActive && coupon.expiryDate > new Date()) {
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new Error("Coupon usage limit reached.");
      }

      const minOrderValue = coupon.minOrderValue || 0;
      if (totalAmount >= minOrderValue) {
        if (coupon.discountType === DiscountType.PERCENTAGE) {
          discountAmount = totalAmount * (coupon.discountValue / 100);
          if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        } else {
          discountAmount = Math.min(coupon.discountValue, totalAmount);
        }
      }
    }
  }

  const shippingFee = 50;
  const subtotalAfterDiscount = Math.max(0, totalAmount - discountAmount);
  
  // Get VAT rate from settings
  let vatRate = VAT_RATE; // Default Egypt VAT
  try {
    const vatSetting = await prisma.systemSettings.findUnique({ where: { key: 'VAT_RATE' } });
    if (vatSetting) vatRate = parseFloat(vatSetting.value) / 100;
  } catch {}
  
  const vatAmount = subtotalAfterDiscount * vatRate;
  const finalTotal = subtotalAfterDiscount + vatAmount + shippingFee;

  const order = await prisma.$transaction(async (tx) => {
    // Re-verify stock and decrement within transaction
    for (const item of cartItems) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId || '' } });
      if (!variant || variant.stockCount < item.qty) throw new Error(`Out of stock or invalid variant for ${item.name}.`);
      
      const updatedVariant = await tx.productVariant.updateMany({
        where: { id: variant.id, stockCount: { gte: item.qty } },
        data: { stockCount: { decrement: item.qty } }
      });
      if (updatedVariant.count === 0) throw new Error(`Concurrency error: ${item.name} just sold out.`);
    }

    const newOrder = await tx.order.create({
      data: {
        userId: isGuest ? null : userId,
        guestEmail: isGuest ? guestEmail : null,
        couponId: couponId || null,
        totalAmount: finalTotal,
        discountAmount,
        shippingFee,
        paymentMethod: paymentMethod === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'CASH_ON_DELIVERY',
        paymentStatus: paymentMethod === 'CASH_ON_DELIVERY' ? 'UNPAID' : 'PAID',
        status: OrderStatus.CONFIRMED, 
        shippingAddressSnapshot: JSON.stringify(addressInfo),
        items: {
          create: orderItemsData as any
        }
      }
    });

    // Increment coupon usedCount
    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } }
      });
    }

    return newOrder;
  });

// Add loyalty points for registered users
    if (userId && totalAmount > 0) {
      try {
        const { addLoyaltyPoints } = await import('./loyalty');
        await addLoyaltyPoints(userId, totalAmount);
      } catch (e) {
        console.error('Failed to add loyalty points:', e);
      }
    }

    // Send order confirmation email
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          const { sendEmail, generateOrderConfirmationEmail } = await import('@/lib/email');
          const orderWithItems = await prisma.order.findUnique({
            where: { id: order.id },
            include: { items: true }
          });
          if (orderWithItems) {
            await sendEmail({
              to: user.email,
              subject: `Order Confirmation - ${order.id.slice(0, 8)}`,
              html: generateOrderConfirmationEmail(orderWithItems, user)
            });
          }
        }
      } catch (e) {
        console.error('Failed to send confirmation email:', e);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/admin-os');
    return { success: true, orderId: order.id };
  }
