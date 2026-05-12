import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OrderItemStatus, OrderStatus } from '@/generated/client';
import type { SessionUser } from '@/types';

// Admin-only order management. The buyer-facing /api/orders/[id]/status route
// enforces a strict state machine; admins need a way to override that (e.g.
// fix a stuck order, force a cancellation after capture, correct the
// shipping snapshot). These endpoints are gated to ADMIN only.

const ALL_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;

const updateSchema = z.object({
  // Force any status transition. Bypasses the buyer-facing state machine on
  // purpose — admins routinely need to fix orders that got stuck.
  status: z.enum(ALL_STATUSES).optional(),
  // Edits to the inline shipping snapshot. We rewrite the JSON blob so all
  // downstream readers (invoice, track page, seller hub) see the new info.
  shipping: z
    .object({
      fullName: z.string().min(1).max(120).optional(),
      phone: z.string().min(1).max(40).optional(),
      street: z.string().min(1).max(300).optional(),
      city: z.string().min(1).max(120).optional(),
      governorate: z.string().min(1).max(120).optional(),
      postalCode: z.string().max(20).optional(),
      country: z.string().max(80).optional(),
      email: z.string().email().max(254).optional(),
    })
    .partial()
    .optional(),
  orderNotes: z.string().max(1000).optional().nullable(),
  giftWrapping: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: 'Unauthorized', status: 401 } as const;
  const role = (session.user as SessionUser).role;
  if (role !== 'ADMIN') return { error: 'Forbidden', status: 403 } as const;
  return { ok: true } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    const data: {
      status?: OrderStatus;
      shippingAddressSnapshot?: string;
      orderNotes?: string | null;
      giftWrapping?: boolean;
    } = {};

    if (parsed.data.status) {
      data.status = parsed.data.status as OrderStatus;
    }

    if (parsed.data.shipping) {
      // Merge edits onto the existing snapshot rather than overwriting the
      // whole blob, so admins can edit one field without re-typing the rest.
      const existing = order.shippingAddressSnapshot
        ? safeJsonParse(order.shippingAddressSnapshot)
        : {};
      const merged = { ...existing, ...parsed.data.shipping };
      data.shippingAddressSnapshot = JSON.stringify(merged);
    }

    if (parsed.data.orderNotes !== undefined) {
      data.orderNotes = parsed.data.orderNotes;
    }
    if (parsed.data.giftWrapping !== undefined) {
      data.giftWrapping = parsed.data.giftWrapping;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'No changes provided' }, { status: 400 });
    }

    // If the new status is CANCELLED and we weren't already, mirror the
    // cancellation onto the order items so the seller hub reflects it.
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.order.update({ where: { id }, data });
      if (data.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
        await tx.orderItem.updateMany({
          where: {
            orderId: id,
            status: {
              notIn: [
                OrderItemStatus.CANCELLED,
                OrderItemStatus.RETURNED,
                OrderItemStatus.REFUNDED,
              ],
            },
          },
          data: { status: OrderItemStatus.CANCELLED },
        });
      }
      return result;
    });

    return NextResponse.json({ message: 'Order updated', order: updated }, { status: 200 });
  } catch (err) {
    console.error('[admin/orders] PATCH error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    // Restock for any order item that was still "live" at deletion time
    // (i.e. not already cancelled / returned). Otherwise stock would leak
    // when admins clean up bad orders.
    const liveStatuses: OrderItemStatus[] = [
      OrderItemStatus.PENDING,
      OrderItemStatus.CONFIRMED,
      OrderItemStatus.SHIPPED,
      OrderItemStatus.DELIVERED,
      OrderItemStatus.RETURN_REQUESTED,
    ];

    await prisma.$transaction(async tx => {
      for (const item of order.items) {
        if (liveStatuses.includes(item.status)) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stockCount: { increment: item.quantity } },
          });
        }
      }
      // Order items are deleted via cascade FK. Other relations like
      // returnRequests / shipments are also cascaded by the schema.
      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Order deleted' }, { status: 200 });
  } catch (err) {
    console.error('[admin/orders] DELETE error:', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

function safeJsonParse(input: string): Record<string, unknown> {
  try {
    const v = JSON.parse(input);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
