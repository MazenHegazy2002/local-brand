import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'PENDING_PAYMENT': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['SHIPPED', 'CANCELLED'],
  'SHIPPED': ['DELIVERED', 'RETURNED'],
  'DELIVERED': ['RETURNED'],
  'CANCELLED': [],
  'RETURNED': []
};

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { status } = await req.json();
    const params = await context.params;
    const orderId = params.id;
    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    // Fetch current order status
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    // Enforce State Machine Transitions
    const allowedNextStates = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNextStates.includes(status)) {
      return NextResponse.json({ message: `Invalid state transition from ${order.status} to ${status}` }, { status: 400 });
    }

    // Role-based constraints
    if (role === 'BUYER') {
      if (status !== 'CANCELLED' && status !== 'RETURNED') {
        return NextResponse.json({ message: 'Buyers can only CANCEL or RETURN orders' }, { status: 403 });
      }
      if (order.userId !== userId) {
        return NextResponse.json({ message: 'Unauthorized modification' }, { status: 403 });
      }
    }

    // Commission Engine trigger on DELIVERED
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
        include: { variant: { include: { product: { include: { seller: true } } } } }
      });
      
      // Calculate split per seller
      for (const item of orderItems) {
        const seller = item.variant.product.seller;
        const totalValue = item.priceAtPurchase * item.quantity;
        const platformCut = totalValue * seller.commissionRate;
        const sellerPayout = totalValue - platformCut;
        
        await prisma.sellerProfile.update({
          where: { id: seller.id },
          data: { balance: { increment: sellerPayout } }
        });
      }
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return NextResponse.json({ message: 'Order status updated', order: updatedOrder }, { status: 200 });

  } catch (error) {
    console.error('Order Status Update Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
