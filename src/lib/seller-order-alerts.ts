// Tell each seller about a new order for their products: email, in-app notification
// and a push to the app. Sellers only see an order once it's cash on delivery or
// paid (VISIBLE_ORDER_WHERE), so this runs at checkout for COD and again when a
// prepaid order is confirmed; a seller already notified about the order is skipped.
import { prisma } from '@/lib/prisma';
import { PLATFORM_URL } from '@/lib/constants';

const VISIBLE_PAYMENT = new Set(['PAID', 'AUTHORIZED', 'PARTIALLY_REFUNDED']);

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

const PAYMENT_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on delivery',
  INSTAPAY: 'InstaPay',
  VODAFONE_CASH: 'Vodafone Cash',
};

export async function notifySellersOfOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentMethod: true,
        paymentStatus: true,
        shippingAddressSnapshot: true,
        items: {
          select: {
            productTitleSnapshot: true,
            quantity: true,
            priceAtPurchase: true,
            selectedSize: true,
            selectedColor: true,
            variant: {
              select: {
                product: {
                  select: {
                    seller: {
                      select: { storeName: true, userId: true, user: { select: { email: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!order) return;
    const visible =
      order.paymentMethod === 'CASH_ON_DELIVERY' || VISIBLE_PAYMENT.has(order.paymentStatus);
    if (!visible) return;

    const bySeller = new Map<
      string,
      { storeName: string; email: string | null; items: typeof order.items }
    >();
    for (const item of order.items) {
      const seller = item.variant?.product?.seller;
      if (!seller) continue;
      const entry = bySeller.get(seller.userId) ?? {
        storeName: seller.storeName,
        email: seller.user?.email ?? null,
        items: [],
      };
      entry.items.push(item);
      bySeller.set(seller.userId, entry);
    }

    let city = '';
    try {
      const addr = JSON.parse(order.shippingAddressSnapshot || '{}');
      city = [addr.city, addr.governorate].filter(Boolean).join(', ');
    } catch {
      /* old orders may not have a JSON snapshot */
    }
    const ref = `#${order.id.slice(0, 8).toUpperCase()}`;
    const link = `/seller-hub?tab=orders&order=${order.id}`;
    const payment = PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod.replace(/_/g, ' ');

    const { notifyUser, pushToUser } = await import('@/lib/notification-helpers');
    const { sendEmail } = await import('@/lib/email');

    for (const [userId, s] of bySeller) {
      const already = await prisma.notification.findFirst({
        where: { userId, link },
        select: { id: true },
      });
      if (already) continue;

      const units = s.items.reduce((n, i) => n + i.quantity, 0);
      const total = s.items.reduce((n, i) => n + i.priceAtPurchase * i.quantity, 0);
      const title = `New order ${ref} 🛍️`;
      const message = `${units} item${units === 1 ? '' : 's'} · ${total.toLocaleString()} EGP · ${payment}`;

      await notifyUser({ userId, title, message, link });
      await pushToUser(userId, title, message);

      if (s.email) {
        const rows = s.items
          .map(i => {
            const opts = [i.selectedSize, i.selectedColor].filter(Boolean).join(' · ');
            return `<tr><td style="padding:6px 0">${esc(i.productTitleSnapshot)}${opts ? `<br><span style="color:#64748b;font-size:12px">${esc(opts)}</span>` : ''}</td><td style="padding:6px 0;text-align:center">×${i.quantity}</td><td style="padding:6px 0;text-align:right">${(i.priceAtPurchase * i.quantity).toLocaleString()} EGP</td></tr>`;
          })
          .join('');
        await sendEmail({
          to: s.email,
          subject: `New order ${ref} for ${s.storeName}`,
          html: `<p>Hi ${esc(s.storeName)},</p><p>You have a new order <strong>${ref}</strong>. Please accept it and get it ready to ship.</p><table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table><p style="margin-top:12px"><strong>Your total:</strong> ${total.toLocaleString()} EGP<br><strong>Payment:</strong> ${esc(payment)}${city ? `<br><strong>Ship to:</strong> ${esc(city)}` : ''}</p><p><a href="${PLATFORM_URL}/seller-hub?tab=orders">Open Seller Hub → Orders</a></p>`,
        });
      }
    }
  } catch (err) {
    console.error(`[seller-order-alerts] failed for order ${orderId}:`, err);
  }
}
