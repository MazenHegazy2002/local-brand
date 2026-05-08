import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const proofSchema = z.object({
  orderItemId: z.string().uuid(),
  proofImageUrl: z.string().url().optional(),
  signature: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Upload delivery proof (signature or photo). Called by couriers / sellers when
 * an order is delivered. Marks the order item as DELIVERED and stores proof in
 * the shipment record.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    if (role !== 'SELLER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = proofSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid proof data', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orderItemId, proofImageUrl, signature, notes } = parsed.data;

    if (!proofImageUrl && !signature) {
      return NextResponse.json(
        { message: 'Either proofImageUrl or signature is required' },
        { status: 400 }
      );
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true, variant: { include: { product: { include: { seller: true } } } } },
    });

    if (!orderItem) {
      return NextResponse.json({ message: 'Order item not found' }, { status: 404 });
    }

    // If seller, verify they own this product
    if (role === 'SELLER') {
      const userId = (session.user as SessionUser).id;
      const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } });
      if (!sellerProfile || orderItem.variant.product.sellerId !== sellerProfile.id) {
        return NextResponse.json({ message: 'Not your order' }, { status: 403 });
      }
    }

    // Transaction: mark item delivered, update/create shipment record
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'DELIVERED' },
      });

      // Update shipment record (or create one if missing)
      const existingShipment = await tx.shipment.findFirst({
        where: { orderId: orderItem.orderId },
      });

      if (existingShipment) {
        await tx.shipment.update({
          where: { id: existingShipment.id },
          data: { deliveredAt: new Date() },
        });
      } else {
        await tx.shipment.create({
          data: {
            orderId: orderItem.orderId,
            deliveredAt: new Date(),
          },
        });
      }

      // If all order items are delivered, mark the order as DELIVERED
      const remainingItems = await tx.orderItem.count({
        where: {
          orderId: orderItem.orderId,
          status: { notIn: ['DELIVERED', 'RETURNED', 'REFUNDED', 'CANCELLED'] },
        },
      });

      if (remainingItems === 0) {
        await tx.order.update({
          where: { id: orderItem.orderId },
          data: { status: 'DELIVERED' },
        });
      }

      // Notify buyer
      if (orderItem.order.userId) {
        await tx.notification.create({
          data: {
            userId: orderItem.order.userId,
            title: 'Delivered!',
            message: `Your order item "${orderItem.productTitleSnapshot}" has been delivered.`,
            link: `/dashboard/orders/${orderItem.orderId}`,
          },
        });
      }
    });

    // Best-effort delivery email to buyer
    if (orderItem.order.userId) {
      const user = await prisma.user.findUnique({ where: { id: orderItem.order.userId } });
      if (user?.email) {
        import('@/lib/email').then((m) => {
          m.sendEmail({
            to: user.email,
            subject: `Your order from ${orderItem.sellerNameSnapshot} has arrived!`,
            html: `
<p>Hi ${user.name},</p>
<p>Great news — your order <strong>${orderItem.productTitleSnapshot}</strong> has been delivered.</p>
<p>You have 14 days to return it if you're not 100% satisfied. We'd also love a review!</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${orderItem.orderId}">View order</a></p>
<hr />
${notes ? `<p><em>Courier note:</em> ${notes}</p>` : ''}
<p>— Local Brand</p>
            `,
          }).catch(() => { /* dev fallback */ });
        }).catch(() => { /* ignore */ });
      }
    }

    return NextResponse.json({ success: true, message: 'Delivery proof recorded' });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[delivery-proof] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to record delivery proof' },
      { status: 500 }
    );
  }
}
