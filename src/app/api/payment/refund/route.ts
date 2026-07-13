import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { VAT_RATE } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { orderItemId, amount, reason: _reason } = await req.json();
    const userId = (session.user as SessionUser).id;
    const role = (session.user as SessionUser).role;

    if (!orderItemId) {
      return NextResponse.json({ message: 'Order item ID is required' }, { status: 400 });
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        variant: {
          include: {
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json({ message: 'Order item not found' }, { status: 404 });
    }

    if (orderItem.order.userId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (orderItem.status === 'REFUNDED' || orderItem.status === 'CANCELLED') {
      return NextResponse.json({ message: 'Item already refunded or cancelled' }, { status: 400 });
    }

    const maxRefund = orderItem.priceAtPurchase * orderItem.quantity;
    const requested = typeof amount === 'number' && amount > 0 ? amount : maxRefund;
    const refundAmount = Math.min(requested, maxRefund);

    if (orderItem.order.paymentId && orderItem.order.paymentStatus === 'PAID') {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
        await stripe.refunds.create({
          payment_intent: orderItem.order.paymentId,
          amount: Math.round(refundAmount * 100),
        });
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        return NextResponse.json(
          { message: 'Stripe refund failed. The payment gateway rejected the request.' },
          { status: 502 }
        );
      }
    }

    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'REFUNDED' },
    });

    const currentDiscount = orderItem.order.discountAmount || 0;
    const currentShippingFee = orderItem.order.shippingFee;
    const remainingItems = await prisma.orderItem.findMany({
      where: { orderId: orderItem.order.id, id: { not: orderItemId }, status: { not: 'REFUNDED' } },
    });

    const remainingSubtotal = remainingItems.reduce(
      (sum, item) => sum + item.priceAtPurchase * item.quantity,
      0
    );
    const newVat = remainingSubtotal * VAT_RATE;
    const newTotal = remainingSubtotal + newVat + currentShippingFee - currentDiscount;

    await prisma.order.update({
      where: { id: orderItem.orderId },
      data: {
        totalAmount: Math.max(0, newTotal),
        paymentStatus:
          orderItem.order.paymentStatus === 'PAID'
            ? 'PARTIALLY_REFUNDED'
            : orderItem.order.paymentStatus,
      },
    });

    await prisma.productVariant.update({
      where: { id: orderItem.variantId },
      data: { stockCount: { increment: orderItem.quantity } },
    });

    return NextResponse.json({
      success: true,
      refundAmount,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Refund Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Use POST to process a refund',
      requiredFields: ['orderItemId'],
      optionalFields: ['amount', 'reason'],
    },
    { status: 200 }
  );
}
