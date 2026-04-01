import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/orders/[id]/track — live order tracking status
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { seller: { select: { storeName: true } } } } }
            }
          }
        },
        shipments: true,
      }
    });

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    if (role === 'BUYER' && order.userId !== userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Build timeline steps
    const allStatuses = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentIdx = allStatuses.indexOf(order.status);

    const timeline = allStatuses.map((s, i) => ({
      status: s,
      label: {
        'PENDING_PAYMENT': 'Order Placed',
        'CONFIRMED': 'Order Confirmed',
        'PROCESSING': 'Being Packed',
        'SHIPPED': 'On the Way',
        'DELIVERED': 'Delivered',
      }[s],
      completed: i <= currentIdx && !['CANCELLED', 'RETURNED'].includes(order.status),
      active: i === currentIdx,
    }));

    return NextResponse.json({
      orderId,
      status: order.status,
      timeline,
      shipment: order.shipments[0] || null,
      estimatedDelivery: order.status === 'SHIPPED'
        ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
