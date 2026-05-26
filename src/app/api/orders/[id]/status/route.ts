import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderStatus } from '@/generated/client';
import { SessionUser } from '@/types';
import { orderStatusUpdateSchema } from '@/lib/validation';

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = orderStatusUpdateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: validated.error.errors[0].message }, { status: 400 });
    }

    const { status } = validated.data;
    const params = await context.params;
    const orderId = params.id;
    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;

    // Fetch current order status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    // Enforce State Machine Transitions
    const allowedNextStates = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNextStates.includes(status)) {
      return NextResponse.json(
        { message: `Invalid state transition from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    // Role-based constraints
    if (role === 'BUYER') {
      if (status !== OrderStatus.CANCELLED && status !== OrderStatus.RETURNED) {
        return NextResponse.json(
          { message: 'Buyers can only CANCEL or RETURN orders' },
          { status: 403 }
        );
      }
      if (order.userId !== userId) {
        return NextResponse.json({ message: 'Unauthorized modification' }, { status: 403 });
      }
    }

    // Build update payload. We stamp deliveredAt the first time an order
    // transitions into DELIVERED so the seller-earnings escrow window has a
    // reliable start time (instead of being fooled by later updatedAt
    // bumps from edits/notes/etc.).
    const data: { status: OrderStatus; deliveredAt?: Date } = { status };
    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      data.deliveredAt = new Date();

      // Mirror DELIVERED onto each item so per-item earnings/escrow
      // calculations agree with the order-level status. We only flip live
      // items — anything already cancelled/returned stays as-is.
      await prisma.orderItem.updateMany({
        where: {
          orderId,
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED'] },
        },
        data: { status: 'DELIVERED' },
      });
      // NOTE: previously this incremented sellerProfile.balance per item.
      // That column is now vestigial — earnings are always computed from
      // the orders table via computeSellerEarnings, which gives us escrow,
      // refund-aware reconciliation, and a single source of truth.
    } else if (status === OrderStatus.SHIPPED && order.status !== OrderStatus.SHIPPED) {
      // Mirror SHIPPED onto every live item so seller-hub order views
      // reflect the correct courier-stage status.
      await prisma.orderItem.updateMany({
        where: {
          orderId,
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED', 'DELIVERED'] },
        },
        data: { status: 'SHIPPED' },
      });
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data,
    });

    // Hook in affiliate commissions
    try {
      const { confirmCommission, cancelCommission } = await import('@/lib/checkout-affiliate');
      if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
        await confirmCommission(orderId);
      } else if (
        (status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) &&
        order.status !== status
      ) {
        await cancelCommission(orderId);
      }
    } catch (err) {
      console.error('Failed to trigger affiliate commission updates:', err);
    }

    return NextResponse.json(
      { message: 'Order status updated', order: updatedOrder },
      { status: 200 }
    );
  } catch (error) {
    console.error('Order Status Update Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
