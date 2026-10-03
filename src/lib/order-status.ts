import { prisma } from '@/lib/prisma';
import { OrderStatus, type Order } from '@/generated/client';

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

export type OrderStatusResult =
  | { ok: true; order: Order }
  | { ok: false; httpStatus: number; message: string };

/**
 * Shared order-level status change (state machine + role rules + side
 * effects). Used by PATCH /api/orders/[id]/status (session) and the mobile
 * seller routes (Bearer).
 */
export async function changeOrderStatus(
  user: { id: string; role: string },
  orderId: string,
  status: OrderStatus
): Promise<OrderStatusResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, httpStatus: 404, message: 'Order not found' };

  // Enforce State Machine Transitions
  const allowedNextStates = VALID_TRANSITIONS[order.status] || [];
  if (!allowedNextStates.includes(status)) {
    return {
      ok: false,
      httpStatus: 400,
      message: `Invalid state transition from ${order.status} to ${status}`,
    };
  }

  // Role-based constraints
  if (user.role === 'BUYER') {
    if (status !== OrderStatus.CANCELLED && status !== OrderStatus.RETURNED) {
      return { ok: false, httpStatus: 403, message: 'Buyers can only CANCEL or RETURN orders' };
    }
    if (order.userId !== user.id) {
      return { ok: false, httpStatus: 403, message: 'Unauthorized modification' };
    }
  }

  if (user.role === 'SELLER') {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    if (!sellerProfile) return { ok: false, httpStatus: 403, message: 'Forbidden' };
    const ownsItem = await prisma.orderItem.findFirst({
      where: { orderId, variant: { product: { sellerId: sellerProfile.id } } },
    });
    if (!ownsItem) return { ok: false, httpStatus: 403, message: 'Forbidden' };
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

    if (order.userId) {
      try {
        const loyaltyMod = await import('@/app/actions/loyalty');
        await loyaltyMod.addLoyaltyPoints(
          order.userId,
          order.totalAmount - order.shippingFee,
          undefined,
          `Earned for delivered order #${order.id.slice(0, 8).toUpperCase()}`
        );
      } catch (err) {
        console.error('[status/route] Failed to award loyalty points on delivery:', err);
      }
    }
    // NOTE: earnings are computed from the orders table via
    // computeSellerEarnings; sellerProfile.balance is vestigial.
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

  const updatedOrder = await prisma.order.update({ where: { id: orderId }, data });

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

  // Best-effort status transition notification email.
  void (async () => {
    try {
      const { triggerOrderStatusEmail } = await import('@/lib/email');
      await triggerOrderStatusEmail(orderId, status);
    } catch (err) {
      console.error('Failed to trigger order status email:', err);
    }
  })();

  return { ok: true, order: updatedOrder };
}
