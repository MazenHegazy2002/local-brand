import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const orderId = params.id;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Fetch order to build the invoice
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { variant: { include: { product: { include: { seller: true } } } } }
        },
        user: true
      }
    });

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    // Validate ownership (allow guest orders for guest email)
    if (role === 'BUYER' && order.userId && order.userId !== userId && !order.guestEmail) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // In Egypt, Standard VAT is 14%
    const VAT_RATE = 0.14;
    
    // For simplicity, assuming the totalAmount is Tax Inclusive or Tax Exclusive depending on your business rules.
    // Standard rule: Prices are Tax Exclusive, so we calculate VAT on top of the subtotal.
    const subtotal = order.items.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);
    const vatAmount = subtotal * VAT_RATE;
    const shippingFee = order.shippingFee;
    const totalToPay = subtotal + vatAmount + shippingFee - order.discountAmount;

    // Build formal JSON structure representing the PDF Invoice Payload
    const customerName = order.user?.name || order.guestEmail || 'Guest Customer';
    const customerEmail = order.user?.email || order.guestEmail || '';
    
    const invoice = {
      invoiceNumber: `LCL-INV-${order.id.split('-')[0].toUpperCase()}`,
      date: order.createdAt,
      platform: {
        name: 'LocalBrand Egypt',
        taxRegistrationNumber: 'XXX-XXX-XXX', // Required for legal Egypt e-invoicing
        address: 'Cairo, Egypt'
      },
      customer: {
        name: customerName,
        email: customerEmail,
        address: JSON.parse(order.shippingAddressSnapshot)
      },
      lineItems: order.items.map(i => ({
        description: i.productTitleSnapshot,
        seller: i.sellerNameSnapshot,
        qty: i.quantity,
        unitPrice: i.priceAtPurchase,
        total: i.quantity * i.priceAtPurchase
      })),
      financials: {
        subtotalEGP: subtotal.toFixed(2),
        vatAmountEGP: vatAmount.toFixed(2),
        vatRate: '14%',
        shippingEGP: shippingFee.toFixed(2),
        discountEGP: order.discountAmount.toFixed(2),
        finalTotalEGP: totalToPay.toFixed(2),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus
      }
    };

    return NextResponse.json({ invoice }, { status: 200 });

  } catch (error) {
    console.error('Invoice Generation Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
