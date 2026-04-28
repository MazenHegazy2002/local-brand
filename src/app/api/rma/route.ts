import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/rma — buyer requests a return
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { orderId, orderItemId, reason, description } = await req.json();

    if (!orderId || !reason) {
      return NextResponse.json({ message: 'orderId and reason are required' }, { status: 400 });
    }

    // Verify buyer owns the order
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      return NextResponse.json({ message: 'Order not found or forbidden' }, { status: 404 });
    }

    // Enforce 14-day return window post-delivery
    if (order.status !== 'DELIVERED') {
      return NextResponse.json({ message: 'Order must be in DELIVERED status to request a return' }, { status: 400 });
    }

    const deliveryDate = order.updatedAt;
    const daysSinceDelivery = (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 14) {
      return NextResponse.json({ message: 'Return window has expired (14 days from delivery)' }, { status: 400 });
    }

    // Update order/item status to RETURN_REQUESTED
    if (orderItemId) {
      await prisma.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'RETURN_REQUESTED' }
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'RETURNED' }
      });
    }

    const caseRef = `RMA-${orderId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    return NextResponse.json({
      message: 'Return request submitted. The seller will review within 48 hours.',
      caseReference: caseRef,
      reason,
    }, { status: 201 });

  } catch (error) {
    console.error('RMA Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
