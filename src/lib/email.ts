// Email notification utility
// For production, integrate with SendGrid, Resend, AWS SES, or similar

import { CONTACT_PHONE, SUPPORT_EMAIL, VAT_RATE } from '@/lib/constants';
import type { Order, User, OrderItem } from '@/types';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;

  let provider = 'resend';
  let emailFrom = 'noreply@brandy.com';
  let emailFromName = 'Brandy';
  let resendKey = process.env.RESEND_API_KEY || '';
  let smtpHost = '';
  let smtpPort = 587;
  let smtpUser = '';
  let smtpPass = '';

  try {
    const { getSetting } = await import('@/lib/admin-settings-registry');
    provider = await getSetting<string>('EMAIL_PROVIDER').catch(() => 'resend');
    emailFrom = await getSetting<string>('EMAIL_FROM').catch(() => 'noreply@brandy.com');
    emailFromName = await getSetting<string>('EMAIL_FROM_NAME').catch(() => 'Brandy');
    resendKey =
      (await getSetting<string>('RESEND_API_KEY').catch(() => '')) ||
      process.env.RESEND_API_KEY ||
      '';
    smtpHost = await getSetting<string>('SMTP_HOST').catch(() => '');
    smtpPort = await getSetting<number>('SMTP_PORT').catch(() => 587);
    smtpUser = await getSetting<string>('SMTP_USER').catch(() => '');
    smtpPass = await getSetting<string>('SMTP_PASS').catch(() => '');
  } catch (err) {
    console.error('[email] failed to fetch admin settings, using env fallbacks:', err);
  }

  // File logging fallback: write to emails.log inside the workspace
  try {
    const fs = await import('fs');
    const path = await import('path');
    const workspaceRoot = 'c:/Users/Mazen/Desktop/Apps Store/Local brand';
    const logPath = path.join(workspaceRoot, 'emails.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] TO: ${to}\nSUBJECT: ${subject}\nHTML:\n${html}\n${'='.repeat(80)}\n\n`;
    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[email] Logged email to ${logPath}`);
  } catch (err) {
    console.error('[email] Failed to write to emails.log:', err);
  }

  if (provider === 'smtp' && smtpHost) {
    try {
      // @ts-expect-error -- nodemailer is an optional peer dep; types may not be installed
      const nodemailer = (await import('nodemailer')) as any;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser
          ? {
              user: smtpUser,
              pass: smtpPass,
            }
          : undefined,
      });

      await transporter.sendMail({
        from: `"${emailFromName}" <${emailFrom}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error('[email] SMTP send failed:', err);
      // Fall through to Resend or fallback below
    }
  }

  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const fromAddress = `"${emailFromName}" <${emailFrom}>`;
      const { error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });
      if (error) {
        console.error('[email] Resend rejected the message:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[email] Failed to send via Resend:', err);
      return false;
    }
  }

  // If no email credentials or live keys, return true in dev/fallback as we logged it to file
  console.log(
    `[email] Development fallback — would have sent to ${to}: "${subject}". Check emails.log for contents.`
  );
  return true;
}

export function generateOrderConfirmationEmail(order: Order, user: User | null): string {
  const itemsList =
    order.items
      ?.map(
        (item: OrderItem) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.productTitleSnapshot}</strong><br>
        <small style="color: #666;">Qty: ${item.quantity} × ${item.priceAtPurchase} EGP</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        <strong>${(item.priceAtPurchase * item.quantity).toLocaleString()} EGP</strong>
      </td>
    </tr>
  `
      )
      .join('') || '';

  const address = order.shippingAddressSnapshot ? JSON.parse(order.shippingAddressSnapshot) : {};

  const subtotalAfterDiscount = (order.totalAmount - order.shippingFee) / (1 + VAT_RATE);
  const subtotalBeforeDiscount = subtotalAfterDiscount + order.discountAmount;
  const vatAmount = subtotalAfterDiscount * VAT_RATE;

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
      <h1 style="margin: 0; font-size: 24px;">BRANDY</h1>
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
          <span>${subtotalBeforeDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
        </div>
        ${
          order.discountAmount > 0
            ? `
        <div style="display: flex; justify-content: space-between; margin: 8px 0; color: green;">
          <span>Discount:</span>
          <span>-${order.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
        </div>
        `
            : ''
        }
        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
          <span>VAT (14%):</span>
          <span>${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
          <span>Shipping:</span>
          <span>${order.shippingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid #eee; font-size: 18px; font-weight: bold;">
          <span>Total:</span>
          <span style="color: #1e3b8a;">${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
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
        <p style="margin: 8px 0 0; color: #666;">Contact us at ${SUPPORT_EMAIL} or call ${CONTACT_PHONE}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">© 2026 Brandy. All rights reserved.</p>
      <p style="margin: 8px 0 0; opacity: 0.7;">This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateShippingNotificationEmail(
  order: Order,
  user: User | null,
  trackingNumber?: string
): string {
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

export function generateOrderCancelledEmail(
  order: Order,
  user: User | null,
  reason?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: #DC2626; color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0;">Order Cancelled</h1>
    </div>
    <div style="padding: 30px;">
      <p>Hi ${user?.name || 'Customer'},</p>
      <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has been cancelled as requested.</p>
      ${reason ? `<p><em>Reason: ${reason}</em></p>` : ''}
      <p>If the order was already paid, a refund of <strong>${order.totalAmount.toLocaleString()} EGP</strong> will be processed back to your original payment method within 5-7 business days.</p>
      <p>If you believe this cancellation is an error, please contact us at ${SUPPORT_EMAIL}.</p>
      <hr>
      <p style="color: #666; font-size: 13px;">— Brandy</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateDeliveryConfirmationEmail(order: Order, user: User | null): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: #10B981; color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0;">Delivered! 🎉</h1>
    </div>
    <div style="padding: 30px;">
      <p>Hi ${user?.name || 'Customer'},</p>
      <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has been delivered.</p>
      <p>We hope you love it! You have 14 days to return it if you're not 100% satisfied.</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${order.id}" style="display:inline-block;padding:12px 24px;background:#10B981;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Leave a Review</a>
      </p>
      <hr>
      <p style="color: #666; font-size: 13px;">Need help? Contact ${SUPPORT_EMAIL}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateRefundProcessedEmail(
  order: Order,
  user: User | null,
  refundAmount: number
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: #3B82F6; color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0;">Refund Processed 💰</h1>
    </div>
    <div style="padding: 30px;">
      <p>Hi ${user?.name || 'Customer'},</p>
      <p>Your refund of <strong>${refundAmount.toLocaleString()} EGP</strong> for order <strong>#${order.id.slice(0, 8)}</strong> has been processed.</p>
      <p>Depending on your payment method, it may take 5-7 business days to appear in your account.</p>
      <hr>
      <p style="color: #666; font-size: 13px;">Questions? Contact ${SUPPORT_EMAIL}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function triggerOrderStatusEmail(orderId: string, status: string): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma');
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });
    if (!order) return false;

    const emailTo = order.user?.email || order.guestEmail;
    if (!emailTo) return false;

    const userObj = order.user ? (order.user as unknown as User) : null;
    let subject = '';
    let html = '';

    if (status === 'SHIPPED') {
      subject = `Your Order Has Shipped! - ${order.id.slice(0, 8)}`;
      html = generateShippingNotificationEmail(order as unknown as Order, userObj);
    } else if (status === 'DELIVERED') {
      subject = `Your Order Has Been Delivered! - ${order.id.slice(0, 8)}`;
      html = generateDeliveryConfirmationEmail(order as unknown as Order, userObj);
    } else if (status === 'CANCELLED') {
      subject = `Order Cancelled - ${order.id.slice(0, 8)}`;
      html = generateOrderCancelledEmail(order as unknown as Order, userObj);
    } else if (status === 'RETURNED') {
      subject = `Refund Processed - ${order.id.slice(0, 8)}`;
      html = generateRefundProcessedEmail(order as unknown as Order, userObj, order.totalAmount);
    } else {
      return false;
    }

    return await sendEmail({ to: emailTo, subject, html });
  } catch (err) {
    console.error(`[email] triggerOrderStatusEmail failed for ${orderId} (${status}):`, err);
    return false;
  }
}
