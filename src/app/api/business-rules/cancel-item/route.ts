import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrderItemStatus, OrderStatus } from '@/generated/client';
import { VAT_RATE } from '@/lib/constants';
import type { SessionUser } from '@/types';

// Partial cancellation — buyer cancels one item from an unshipped order.
// Restocks the variant, marks the item CANCELLED, recomputes the order total
// using the same VAT_RATE that createOrder applied, and preserves the
// shipping fee that was originally charged (the parcel is still being
// delivered as long as at least one item remains).

async function cancelOrderItemInternal(
  orderId: string,
  orderItemId: string,
  userId: string
): Promise<
  | { orderCancelled: true; refundAmount: number }
  | { orderCancelled: false; refundAmount: number; newTotal: number }
> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== userId) {
    throw new Error('Order not found or forbidden');
  }
  if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.CONFIRMED) {
    throw new Error('Order cannot be cancelled at this stage');
  }

  const item = order.items.find(i => i.id === orderItemId);
  if (!item) throw new Error('Order item not found');
  if (item.status === OrderItemStatus.CANCELLED) {
    throw new Error('Item is already cancelled');
  }

  return prisma.$transaction(async tx => {
    // Mark item cancelled + restock
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { status: OrderItemStatus.CANCELLED },
    });
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockCount: { increment: item.quantity } },
    });

    const remainingLive = order.items.filter(
      i => i.id !== orderItemId && i.status !== OrderItemStatus.CANCELLED
    );

    if (remainingLive.length === 0) {
      // Cancel the whole order — refund the order total (gross with VAT/shipping).
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED, totalAmount: 0 },
      });
      return { orderCancelled: true as const, refundAmount: order.totalAmount };
    }

    // Recompute total with the same VAT rate used at checkout. Shipping
    // doesn't change because the parcel still ships; the buyer's refund is
    // only for the cancelled item (price × qty + its VAT share).
    const remainingSubtotal = remainingLive.reduce(
      (sum, i) => sum + i.priceAtPurchase * i.quantity,
      0
    );
    const newVat = remainingSubtotal * VAT_RATE;
    const newTotal = Math.max(
      0,
      remainingSubtotal + newVat + order.shippingFee - (order.discountAmount || 0)
    );

    await tx.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal },
    });

    const itemGross = item.priceAtPurchase * item.quantity;
    const refundAmount = itemGross * (1 + VAT_RATE);
    return { orderCancelled: false as const, refundAmount, newTotal };
  });
}

// POST /api/business-rules/cancel-item
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;
    const { orderId, orderItemId } = await req.json();
    if (!orderId || !orderItemId) {
      return NextResponse.json({ message: 'orderId and orderItemId required' }, { status: 400 });
    }

    const result = await cancelOrderItemInternal(orderId, orderItemId, userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
