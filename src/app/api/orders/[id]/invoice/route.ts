import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VAT_RATE, TAX_REG_NUMBER } from '@/lib/constants';
import { SessionUser, Order, OrderItem, Coupon, User } from '@/types';

type OrderWithDetails = Order & {
  items: OrderItem[];
  user: User | null;
  coupon: Coupon | null;
};

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const orderId = params.id;
    const userId = (session.user as SessionUser).id;
    const role = (session.user as SessionUser).role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { variant: { include: { product: { include: { seller: true } } } } }
        },
        user: true,
        coupon: true
      }
    }) as OrderWithDetails | null;

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (role === 'BUYER' && order.userId && order.userId !== userId && !order.guestEmail) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const address = order.shippingAddressSnapshot ? JSON.parse(order.shippingAddressSnapshot) : {};
    const subtotal = order.items.reduce((sum, item) => sum + (item.priceAtPurchase * item.quantity), 0);
    const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
    const shippingFee = order.shippingFee;

    const html = generateInvoiceHTML({ order, address, subtotal, vatAmount, shippingFee });
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${order.id}.html"`,
      },
    });

  } catch (error) {
    console.error('Invoice Generation Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

interface InvoiceAddress {
  fullName?: string;
  phone?: string;
  street?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  country?: string;
}

interface InvoiceParams {
  order: OrderWithDetails;
  address: InvoiceAddress;
  subtotal: number;
  vatAmount: number;
  shippingFee: number;
}

function generateInvoiceHTML({ order, address, subtotal, vatAmount, shippingFee }: InvoiceParams): string {
  const itemsHTML = order.items.map((item: OrderItem, i: number) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${i + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.productTitleSnapshot}</strong>
        ${item.sellerNameSnapshot ? `<br><span style="font-size: 12px; color: #666;">Seller: ${item.sellerNameSnapshot}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.priceAtPurchase.toLocaleString()} EGP</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${(item.priceAtPurchase * item.quantity).toLocaleString()} EGP</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${order.id.slice(0, 8)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #333; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .company h1 { margin: 0; color: #1e3b8a; font-size: 28px; }
  .company p { margin: 4px 0; color: #666; }
  .invoice-info { text-align: right; }
  .invoice-title { font-size: 28px; color: #1e3b8a; margin-bottom: 8px; font-weight: bold; }
  .invoice-number { font-size: 14px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { background: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; color: #666; }
  .summary { text-align: right; margin-top: 24px; }
  .summary div { display: flex; justify-content: flex-end; gap: 40px; margin: 8px 0; }
  .summary span { min-width: 100px; color: #666; }
  .summary strong { min-width: 100px; text-align: right; }
  .total { font-size: 18px; font-weight: bold; color: #1e3b8a; border-top: 2px solid #1e3b8a; padding-top: 12px; }
  .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-unpaid { background: #fef3c7; color: #92400e; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="company">
      <h1>LOCAL BRAND</h1>
      <p>Egyptian Marketplace for Local Brands</p>
      <p>support@localbrand.com</p>
    </div>
    <div class="invoice-info">
      <div class="invoice-title">INVOICE</div>
      <p class="invoice-number"><strong>Invoice #:</strong> LCL-INV-${order.id.split('-')[0].toUpperCase()}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <p>
        <strong>Status:</strong> 
        <span class="status-badge ${order.paymentStatus === 'PAID' ? 'status-paid' : 'status-unpaid'}">${order.paymentStatus}</span>
      </p>
      ${order.coupon ? `<p><strong>Coupon:</strong> ${order.coupon.code}</p>` : ''}
    </div>
  </div>

  <div style="display: flex; gap: 40px; margin-bottom: 40px;">
    <div>
      <h3 style="color: #666; font-size: 12px; margin-bottom: 8px; text-transform: uppercase;">Bill To</h3>
      <p><strong>${order.user?.name || order.guestEmail || 'Guest'}</strong></p>
      <p>${order.user?.email || order.guestEmail || ''}</p>
      ${address.street ? `<p>${address.street}</p>` : ''}
      ${address.city || address.governorate ? `<p>${[address.city, address.governorate].filter(Boolean).join(', ')}</p>` : ''}
      <p>Egypt</p>
    </div>
    <div>
      <h3 style="color: #666; font-size: 12px; margin-bottom: 8px; text-transform: uppercase;">Ship To</h3>
      <p><strong>${address.fullName || 'Customer'}</strong></p>
      ${address.phone ? `<p>${address.phone}</p>` : ''}
      ${address.street ? `<p>${address.street}</p>` : ''}
      ${address.city || address.governorate ? `<p>${[address.city, address.governorate].filter(Boolean).join(', ')}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="summary">
    <div><span>Subtotal:</span><strong>${subtotal.toLocaleString()} EGP</strong></div>
    <div><span>Shipping:</span><strong>${shippingFee.toLocaleString()} EGP</strong></div>
    ${order.discountAmount > 0 ? `<div><span>Discount:</span><strong style="color: green;">-${order.discountAmount.toLocaleString()} EGP</strong></div>` : ''}
    <div><span>VAT (14%):</span><strong>${vatAmount.toLocaleString()} EGP</strong></div>
    <div class="total"><span>Total:</span><strong>${order.totalAmount.toLocaleString()} EGP</strong></div>
  </div>

  <div class="footer">
    <p><strong>Tax Registration Number:</strong> ${TAX_REG_NUMBER}</p>
    <p><strong>Payment Method:</strong> ${order.paymentMethod?.replace(/_/g, ' ') || 'N/A'} | <strong>Payment Status:</strong> ${order.paymentStatus}</p>
    <p style="margin-top: 20px;">Thank you for shopping with Local Brand! Questions? Contact support@localbrand.com</p>
    <p>© ${new Date().getFullYear()} Local Brand. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}
