// Email notification utility
// For production, integrate with SendGrid, Resend, AWS SES, or similar

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;
  
  // In development, just log the email
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email would be sent:', { to, subject });
    console.log('Email HTML preview:', html.substring(0, 200) + '...');
    return true;
  }

  // In production, integrate with your email provider
  // Example using Resend:
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: 'orders@localbrand.com', to, subject, html });

  try {
    // For now, use console log as placeholder
    console.log('📧 Sending email to:', to);
    console.log('📧 Subject:', subject);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export function generateOrderConfirmationEmail(order: any, user: any): string {
  const itemsList = order.items?.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.productTitleSnapshot}</strong><br>
        <small style="color: #666;">Qty: ${item.quantity} × ${item.priceAtPurchase} EGP</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        <strong>${(item.priceAtPurchase * item.quantity).toLocaleString()} EGP</strong>
      </td>
    </tr>
  `).join('') || '';

  const address = order.shippingAddressSnapshot ? JSON.parse(order.shippingAddressSnapshot) : {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: #1e3b8a; color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">LOCAL BRAND</h1>
      <p style="margin: 8px 0 0; opacity: 0.8;">Order Confirmation</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <h2 style="color: #333; margin-top: 0;">Thank you for your order!</h2>
      <p style="color: #666; line-height: 1.6;">
        Dear ${user?.name || 'Customer'},<br><br>
        Your order has been confirmed and is being processed. Below are your order details:
      </p>

      <!-- Order Info -->
      <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Order ID:</strong> ${order.id}</p>
        <p style="margin: 0 0 8px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: #0F6E56;">Confirmed</span></p>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 12px; border-bottom: 2px solid #1e3b8a;">Product</th>
            <th style="text-align: right; padding: 12px; border-bottom: 2px solid #1e3b8a;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="border-top: 2px solid #eee; padding-top: 20px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
          <span>Subtotal:</span>
          <span>${(order.totalAmount - order.shippingFee).toLocaleString()} EGP</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
          <span>Shipping:</span>
          <span>${order.shippingFee} EGP</span>
        </div>
        ${order.discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin: 8px 0; color: green;">
          <span>Discount:</span>
          <span>-${order.discountAmount} EGP</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid #eee; font-size: 18px; font-weight: bold;">
          <span>Total:</span>
          <span style="color: #1e3b8a;">${order.totalAmount.toLocaleString()} EGP</span>
        </div>
      </div>

      <!-- Shipping Address -->
      <div style="margin-top: 30px;">
        <h3 style="color: #333; margin-bottom: 10px;">Shipping Address</h3>
        <p style="color: #666; line-height: 1.6;">
          ${address.street || 'N/A'}<br>
          ${address.city || ''}, ${address.governorate || ''}<br>
          Egypt
        </p>
      </div>

      <!-- Help -->
      <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: center;">
        <p style="margin: 0; color: #1e3b8a; font-weight: 600;">Need help?</p>
        <p style="margin: 8px 0 0; color: #666;">Contact us at support@localbrand.com or call +20 123 456 7890</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">© 2026 Local Brand. All rights reserved.</p>
      <p style="margin: 8px 0 0; opacity: 0.7;">This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateShippingNotificationEmail(order: any, user: any, trackingNumber?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: #0F6E56; color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0;">Your Order Has Shipped! 📦</h1>
    </div>
    <div style="padding: 30px;">
      <p>Dear ${user?.name || 'Customer'},</p>
      <p>Great news! Your order is on its way.</p>
      ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      <p>You can track your order status at: <a href="${process.env.NEXT_PUBLIC_APP_URL}/track/${order.id}">Track Order</a></p>
    </div>
  </div>
</body>
</html>
  `;
}