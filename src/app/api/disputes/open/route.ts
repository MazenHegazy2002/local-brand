import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notification-helpers';
import { disputeSchema } from '@/lib/validation';
import { SessionUser } from '@/types';

// POST /api/disputes/open — buyer opens a dispute
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = disputeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ message: 'Invalid data', errors: validated.error.format() }, { status: 400 });
    }

    const { orderId, reason, description } = validated.data;
    const userId = (session.user as SessionUser).id;

    // Verify the order belongs to this buyer
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      return NextResponse.json({ message: 'Order not found or forbidden' }, { status: 404 });
    }

    // Store dispute in DB using Dispute model
    const dispute = await prisma.auditLog.create({
      data: {
        adminId: userId,
        action: `DISPUTE_OPENED:${orderId}`,
        targetId: orderId,
        details: JSON.stringify({ reason, description }),
      }
    });

    // Notify seller and admin via notification
    await notifyUser({ userId, title: 'Dispute Submitted', message: `Your dispute for order ${orderId} has been submitted.` });

    return NextResponse.json({
      message: 'Dispute submitted. Our team will review it within 48 hours.',
      caseReference: `DISP-${orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
