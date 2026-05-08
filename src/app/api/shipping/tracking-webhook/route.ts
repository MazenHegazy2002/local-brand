import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@/generated/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const courier = req.headers.get('x-courier-name') || body.courier;

    if (!body.trackingNumber && !body.tracking_id) {
      return NextResponse.json({ message: 'Tracking number is required' }, { status: 400 });
    }

    const trackingNumber = body.trackingNumber || body.tracking_id;
    
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber },
      include: { order: true },
    });

    if (!shipment) {
      return NextResponse.json({ 
        message: 'Shipment not found',
        received: true
      }, { status: 404 });
    }

    const eventStatus = body.status?.toUpperCase() || body.event_type?.toUpperCase();
    
    let newOrderStatus: OrderStatus | undefined = undefined;

    switch (eventStatus) {
      case 'PICKED_UP':
      case 'PICKUP':
        newOrderStatus = OrderStatus.PROCESSING;
        break;
      case 'IN_TRANSIT':
      case 'TRANSIT':
        newOrderStatus = OrderStatus.SHIPPED;
        break;
      case 'DELIVERED':
        newOrderStatus = OrderStatus.DELIVERED;
        break;
      case 'RETURNED':
      case 'RETURN':
        newOrderStatus = OrderStatus.RETURNED;
        break;
    }

    const updateData: { shippedAt?: Date; deliveredAt?: Date; courier?: string } = {};
    if (eventStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    } else if (eventStatus === 'PICKED_UP' || eventStatus === 'IN_TRANSIT') {
      updateData.shippedAt = new Date();
    }
    if (courier) {
      updateData.courier = courier;
    }

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: updateData
    });

    if (newOrderStatus) {
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: newOrderStatus },
      });
    }

    return NextResponse.json({
      received: true,
      trackingNumber,
      status: eventStatus,
      courier: courier || 'unknown'
    }, { status: 200 });

  } catch (error) {
    console.error('Tracking Webhook Error:', error);
    return NextResponse.json({ 
      message: 'Webhook processing error',
      received: true
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Shipping tracking webhook endpoint',
    supported_couriers: ['Aramex', 'Bosta', 'Mumzworld', 'SMSA'],
    events: [
      'PICKED_UP',
      'IN_TRANSIT', 
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED_DELIVERY',
      'RETURNED'
    ],
    note: 'Configure webhook URL with your courier provider dashboard'
  }, { status: 200 });
}