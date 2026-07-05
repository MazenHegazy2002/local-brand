import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@/generated/client';

// Valid state-machine transitions (mirrors /api/orders/[id]/status)
const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

export async function POST(req: Request) {
  try {
    const expectedSecret = process.env.TRACKING_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = req.headers.get('x-webhook-secret');
      if (provided !== expectedSecret) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

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
      return NextResponse.json(
        {
          message: 'Shipment not found',
          received: true,
        },
        { status: 404 }
      );
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
      case 'OUT_FOR_DELIVERY':
        newOrderStatus = OrderStatus.SHIPPED;
        break;
      case 'DELIVERED':
        newOrderStatus = OrderStatus.DELIVERED;
        break;
      case 'RETURNED':
      case 'RETURN':
      case 'FAILED_DELIVERY':
        newOrderStatus = OrderStatus.RETURNED;
        break;
    }

    // Build shipment update payload
    const updateData: { shippedAt?: Date; deliveredAt?: Date; courier?: string } = {};
    if (eventStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    } else if (
      ['PICKED_UP', 'PICKUP', 'IN_TRANSIT', 'TRANSIT', 'OUT_FOR_DELIVERY'].includes(eventStatus)
    ) {
      updateData.shippedAt = new Date();
    }
    if (courier) {
      updateData.courier = courier;
    }

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: updateData,
    });

    if (newOrderStatus) {
      const currentStatus = shipment.order.status;
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

      if (!allowed.includes(newOrderStatus)) {
        // Transition not valid for current state — log and ignore silently
        // (couriers may re-send events; we don't want a 4xx that causes retries)
        return NextResponse.json(
          {
            received: true,
            trackingNumber,
            status: eventStatus,
            note: `Skipped: transition ${currentStatus} → ${newOrderStatus} not allowed`,
          },
          { status: 200 }
        );
      }

      const orderId = shipment.orderId;

      await prisma.$transaction(async tx => {
        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: newOrderStatus!,
            ...(newOrderStatus === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
          },
        });

        // Mirror status to all live order items
        if (newOrderStatus === OrderStatus.SHIPPED) {
          await tx.orderItem.updateMany({
            where: {
              orderId,
              status: {
                notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED', 'DELIVERED'],
              },
            },
            data: { status: 'SHIPPED' },
          });
        } else if (newOrderStatus === OrderStatus.DELIVERED) {
          await tx.orderItem.updateMany({
            where: {
              orderId,
              status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED'] },
            },
            data: { status: 'DELIVERED' },
          });
        }
      });

      // Hook affiliate commissions after DELIVERED (non-fatal)
      if (newOrderStatus === OrderStatus.DELIVERED) {
        try {
          const { confirmCommission } = await import('@/lib/checkout-affiliate');
          await confirmCommission(orderId);
        } catch (err) {
          console.error('[tracking-webhook] Failed to confirm affiliate commission:', err);
        }
      }
    }

    return NextResponse.json(
      {
        received: true,
        trackingNumber,
        status: eventStatus,
        courier: courier || 'unknown',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Tracking Webhook Error:', error);
    return NextResponse.json(
      {
        message: 'Webhook processing error',
        received: true,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Shipping tracking webhook endpoint',
      supported_couriers: ['Aramex', 'Bosta', 'Mumzworld', 'SMSA'],
      events: [
        'PICKED_UP — sets order to PROCESSING',
        'IN_TRANSIT / OUT_FOR_DELIVERY — sets order to SHIPPED',
        'DELIVERED — sets order to DELIVERED, triggers affiliate commission',
        'FAILED_DELIVERY / RETURNED — sets order to RETURNED',
      ],
      note: 'Configure this URL in your courier provider dashboard as the tracking webhook.',
    },
    { status: 200 }
  );
}
