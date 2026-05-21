import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notification-helpers';
import { disputeSchema } from '@/lib/validation';
import { SessionUser } from '@/types';

// Build a short, URL-safe, human-readable case reference.
function makeCaseReference(orderId: string): string {
  return `DISP-${orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

// POST /api/disputes/open — buyer opens a dispute against an order.
//
// Disputes are now stored in the dedicated Dispute model. The previous version
// of this endpoint wrote a synthetic `AuditLog` row with action
// `DISPUTE_OPENED:<orderId>` instead, which meant admin/seller dashboards had
// no proper Dispute table to query against and the schema's enum + indexes
// were never used.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = disputeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: validated.error.format() },
        { status: 400 }
      );
    }

    const { orderId, orderItemId, reason, description } = validated.data;
    const userId = (session.user as SessionUser).id;

    // Verify the order belongs to this buyer.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });

    if (!order || order.userId !== userId) {
      return NextResponse.json({ message: 'Order not found or forbidden' }, { status: 404 });
    }

    // If a specific item is targeted, confirm it belongs to this order and
    // pull its sellerId so admins can pivot by seller from the dispute view.
    let sellerId: string | null = null;
    if (orderItemId) {
      const item = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        select: {
          orderId: true,
          variant: { select: { product: { select: { sellerId: true } } } },
        },
      });
      if (!item || item.orderId !== orderId) {
        return NextResponse.json(
          { message: 'Order item does not belong to this order' },
          { status: 400 }
        );
      }
      sellerId = item.variant.product.sellerId;
    }

    const caseReference = makeCaseReference(orderId);

    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        orderItemId: orderItemId || null,
        buyerId: userId,
        sellerId,
        reason,
        description: description || null,
        status: 'OPEN',
        caseReference,
      },
    });

    // Notify the buyer that their dispute was logged. (Admin notifications go
    // out via the audit/dashboard surface; we don't blast every admin here.)
    await notifyUser({
      userId,
      title: 'Dispute submitted',
      message: `Your dispute (${caseReference}) for order ${orderId.slice(0, 8)} has been submitted. Our team will review it within 48 hours.`,
      link: `/dashboard/orders/${orderId}`,
    }).catch(() => {
      /* notification failure must not block the dispute */
    });

    // Audit log so admins can scan a unified ledger of buyer-initiated events.
    await prisma.auditLog
      .create({
        data: {
          adminId: userId,
          action: 'DISPUTE_OPENED',
          targetId: dispute.id,
          details: `Order ${orderId} — ${reason.slice(0, 200)}`,
        },
      })
      .catch(err => console.error('[disputes/open] audit log failed:', err));

    return NextResponse.json(
      {
        message: 'Dispute submitted. Our team will review it within 48 hours.',
        caseReference,
        disputeId: dispute.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[disputes/open] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
