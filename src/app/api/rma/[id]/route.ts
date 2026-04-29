import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'SELLER') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const { status, adminNotes } = await req.json();

    if (!status || !['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: resolvedParams.id },
      include: { orderItem: true }
    });

    if (!returnRequest) {
      return NextResponse.json({ message: 'Return request not found' }, { status: 404 });
    }

    // Update return request
    const updated = await prisma.returnRequest.update({
      where: { id: resolvedParams.id },
      data: {
        status,
        adminNotes
      }
    });

    // Update order item status based on return status
    let itemStatus = returnRequest.orderItem.status;
    if (status === 'APPROVED') {
      itemStatus = 'RETURNED';
    } else if (status === 'REJECTED') {
      itemStatus = 'DELIVERED'; // Revert to delivered
    }

    await prisma.orderItem.update({
      where: { id: returnRequest.orderItemId },
      data: { status: itemStatus }
    });

    return NextResponse.json({
      message: `Return request ${status.toLowerCase()}`,
      returnRequest: updated
    }, { status: 200 });

  } catch (error: any) {
    console.error('RMA Update Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}