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
    const { orderItemId, reason, details } = await req.json();

    if (!orderItemId || !reason) {
      return NextResponse.json({ message: 'orderItemId and reason are required' }, { status: 400 });
    }

    // Verify buyer owns the order item
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true }
    });

    if (!orderItem || orderItem.order.userId !== userId) {
      return NextResponse.json({ message: 'Order item not found or forbidden' }, { status: 404 });
    }

    // Enforce 14-day return window post-delivery
    if (orderItem.order.status !== 'DELIVERED') {
      return NextResponse.json({ message: 'Order must be DELIVERED to request a return' }, { status: 400 });
    }

    const deliveryDate = orderItem.order.updatedAt;
    const daysSinceDelivery = (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 14) {
      return NextResponse.json({ message: 'Return window has expired (14 days from delivery)' }, { status: 400 });
    }

    // Check if return request already exists
    const existingReturn = await prisma.returnRequest.findUnique({
      where: { orderItemId }
    });

    if (existingReturn) {
      return NextResponse.json({ message: 'Return request already exists for this item' }, { status: 400 });
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderItemId,
        reason,
        details,
        status: 'PENDING'
      }
    });

    // Update order item status
    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'RETURN_REQUESTED' }
    });

    const caseRef = `RMA-${orderItemId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    return NextResponse.json({
      message: 'Return request submitted successfully',
      returnRequest: {
        id: returnRequest.id,
        caseReference: caseRef,
        reason: returnRequest.reason,
        status: returnRequest.status,
        createdAt: returnRequest.createdAt
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('RMA Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/rma — get user's return requests
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    let returnRequests;

    if (role === 'ADMIN' || role === 'SELLER') {
      // Admin/Seller can see all
      returnRequests = await prisma.returnRequest.findMany({
        include: {
          orderItem: {
            include: {
              order: { include: { user: { select: { name: true, email: true } } } },
              variant: { include: { product: { select: { title: true, images: true } } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Buyer sees their own
      returnRequests = await prisma.returnRequest.findMany({
        where: {
          orderItem: {
            order: { userId }
          }
        },
        include: {
          orderItem: {
            include: {
              order: true,
              variant: { include: { product: { select: { title: true, images: true } } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ returnRequests }, { status: 200 });

  } catch (error) {
    console.error('RMA GET Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}