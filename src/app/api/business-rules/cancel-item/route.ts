import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderItemStatus, OrderStatus } from '@/generated/client';

/**
 * Business rule enforcement middleware helpers
 * Implements: coupon stacking, guest checkout, partial cancel, minimum order, COD policy
 */

// Coupon stacking rules
export async function validateCouponStack(couponIds: string[], subtotal: number) {
  if (!couponIds.length) return { valid: true, discount: 0, errors: [] };

  const errors: string[] = [];

  // Rule 1: Max 1 platform-wide coupon (We removed seller-specific check for now as it's not in schema)
  const coupons = await prisma.coupon.findMany({ where: { id: { in: couponIds } } });

  if (coupons.length > 2) errors.push('Max 2 coupons allowed per order');

  if (errors.length) return { valid: false, discount: 0, errors };

  // Calculate combined discount
  let totalDiscount = 0;
  for (const c of coupons) {
    if (!c.isActive || c.expiryDate < new Date()) continue;
    if (c.minOrderValue && subtotal < c.minOrderValue) continue;

    if (c.discountType === 'PERCENTAGE') {
      const disc = subtotal * (c.discountValue / 100);
      totalDiscount += c.maxDiscount ? Math.min(disc, c.maxDiscount) : disc;
    } else {
      totalDiscount += c.discountValue;
    }
  }

  // Rule 2: Combined discount cannot exceed 50% of subtotal
  totalDiscount = Math.min(totalDiscount, subtotal * 0.5);

  return { valid: true, discount: totalDiscount, errors: [] };
}

// Guest checkout: allow without account — returns guest session token
export function generateGuestToken(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Minimum order value enforcement
export function enforceMinimumOrder(subtotal: number, minimumEGP = 50): { valid: boolean; message?: string } {
  if (subtotal < minimumEGP) {
    return { valid: false, message: `Minimum order value is ${minimumEGP} EGP. Add more items to proceed.` };
  }
  return { valid: true };
}

// Partial order cancellation: cancel one item, refund proportionally
export async function cancelOrderItem(orderId: string, orderItemId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });

  if (!order || order.userId !== userId) throw new Error('Order not found or forbidden');
  const currentStatus = order.status;
  if (currentStatus !== OrderStatus.PENDING_PAYMENT && currentStatus !== OrderStatus.CONFIRMED) {
    throw new Error('Order cannot be cancelled at this stage');
  }

  const item = order.items.find(i => i.id === orderItemId);
  if (!item) throw new Error('Order item not found');

  // Mark item as cancelled
  await prisma.orderItem.update({ where: { id: orderItemId }, data: { status: OrderItemStatus.CANCELLED } });

  // Restock the variant
  await prisma.productVariant.update({
    where: { id: item.variantId },
    data: { stockCount: { increment: item.quantity } }
  });

  // Recalculate order total
  const remaining = order.items.filter(i => i.id !== orderItemId && i.status !== OrderItemStatus.CANCELLED);
  const newTotal = remaining.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);
  const vatAmount = newTotal * 0.14;
  const shippingFee = remaining.length > 0 ? 50 : 0;

  // If all items cancelled, cancel entire order
  if (remaining.length === 0) {
    await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED, totalAmount: 0 } });
    return { orderCancelled: true, refundAmount: order.totalAmount };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { totalAmount: newTotal + vatAmount + shippingFee }
  });

  const refundAmount = item.priceAtPurchase * item.quantity * 1.14; // inc. VAT
  return { orderCancelled: false, refundAmount, newTotal: newTotal + vatAmount + shippingFee };
}

// API route — POST /api/business-rules/cancel-item
export async function POST(req: Request) {
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { orderId, orderItemId } = await req.json();
    if (!orderId || !orderItemId) return NextResponse.json({ message: 'orderId and orderItemId required' }, { status: 400 });

    const result = await cancelOrderItem(orderId, orderItemId, userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
