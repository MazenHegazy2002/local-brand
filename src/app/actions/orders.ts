'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { OrderStatus, OrderItemStatus } from '@/generated/client';
import type { SessionUser } from '@/types';
import { createOrderForUser, type CreateOrderResult } from '@/lib/order-creator';

// User-facing order action. Reads the userId from the NextAuth session and
// delegates to `createOrderForUser`. Server-to-server callers (e.g. the
// PaySky callback) bypass this and call `createOrderForUser` directly with
// a verified userId.
export async function createOrder(formData: unknown): Promise<CreateOrderResult> {
  const session = await getServerSession(authOptions);
  const userId = session ? (session.user as SessionUser).id : null;

  // Read the affiliate referral cookie (Task 32 — cookie attribution)
  const cookieStore = await cookies();
  const referralSlug = cookieStore.get('brandy_ref')?.value ?? null;

  const result = await createOrderForUser(userId, formData, referralSlug);

  // Clear the referral cookie once it has been attributed to an order
  if (result.success && referralSlug) {
    cookieStore.delete('brandy_ref');
  }

  if (result.success) revalidatePath('/dashboard');
  return result;
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
    });

    // Best-effort cancel notification email.
    void (async () => {
      try {
        const { triggerOrderStatusEmail } = await import('@/lib/email');
        await triggerOrderStatusEmail(orderId, 'CANCELLED');
      } catch (err) {
        console.error('Failed to trigger order cancel email:', err);
      }
    })();

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
