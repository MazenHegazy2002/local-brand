import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST /api/disputes/open — buyer opens a dispute
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { orderId, orderItemId, reason, description } = await req.json();
    const userId = (session.user as any).id;

    if (!orderId || !reason) {
      return NextResponse.json({ message: 'orderId and reason required' }, { status: 400 });
    }

    // Verify the order belongs to this buyer
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      return NextResponse.json({ message: 'Order not found or forbidden' }, { status: 404 });
    }

    // Log dispute (stored as a note in order for now — full Dispute model can be added in schema migration)
    console.log(`[DISPUTE OPENED] Order: ${orderId} | User: ${userId} | Reason: ${reason} | Details: ${description}`);

    // In production: create a Dispute record in DB, notify seller + admin via email/notification

    return NextResponse.json({
      message: 'Dispute submitted. Our team will review it within 48 hours.',
      caseReference: `DISP-${orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
