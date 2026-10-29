/**
 * @jest-environment node
 *
 * notifySellersOfOrder — each seller in an order gets an email, an in-app notification
 * and a push, once the order is visible to them (COD or paid), and only once.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const seller = (userId: string, storeName: string) => ({
  variant: { product: { seller: { userId, storeName, user: { email: `${userId}@shop.test` } } } },
});
let order: Record<string, unknown> | null;
let alreadyNotified = new Set<string>();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: jest.fn(async () => order) },
    notification: {
      findFirst: jest.fn(async ({ where }: { where: { userId: string } }) =>
        alreadyNotified.has(where.userId) ? { id: 'n1' } : null
      ),
    },
  },
}));
const notifyUser = jest.fn(async (_o: Record<string, unknown>) => {});
const pushToUser = jest.fn(async (..._a: unknown[]) => {});
jest.mock('@/lib/notification-helpers', () => ({
  notifyUser: (o: Record<string, unknown>) => notifyUser(o),
  pushToUser: (...a: unknown[]) => pushToUser(...a),
}));
const sendEmail = jest.fn(async (_o: { to: string; subject: string; html: string }) => true);
jest.mock('@/lib/email', () => ({
  sendEmail: (o: { to: string; subject: string; html: string }) => sendEmail(o),
}));

import { notifySellersOfOrder } from '@/lib/seller-order-alerts';

beforeEach(() => {
  jest.clearAllMocks();
  alreadyNotified = new Set();
  order = {
    id: 'abcdef12-0000-0000-0000-000000000000',
    paymentMethod: 'CASH_ON_DELIVERY',
    paymentStatus: 'UNPAID',
    shippingAddressSnapshot: JSON.stringify({ city: 'Nasr City', governorate: 'Cairo' }),
    items: [
      {
        productTitleSnapshot: 'Linen <Shirt>',
        quantity: 2,
        priceAtPurchase: 300,
        selectedSize: 'M',
        selectedColor: null,
        ...seller('s1', 'Nile Wear'),
      },
      {
        productTitleSnapshot: 'Scarf',
        quantity: 1,
        priceAtPurchase: 150,
        selectedSize: null,
        selectedColor: 'Beige',
        ...seller('s2', 'Cairo Knits'),
      },
    ],
  };
});

describe('notifySellersOfOrder', () => {
  it('notifies every seller in a cash-on-delivery order about their own items', async () => {
    await notifySellersOfOrder('o1');
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const mail = sendEmail.mock.calls.find(c => c[0].to === 's1@shop.test')![0];
    expect(mail.subject).toBe('New order #ABCDEF12 for Nile Wear');
    expect(mail.html).toContain('Linen &lt;Shirt&gt;');
    expect(mail.html).toContain('600 EGP');
    expect(mail.html).toContain('Nasr City, Cairo');
    expect(mail.html).not.toContain('Scarf');
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 's2', message: '1 item · 150 EGP · Cash on delivery' })
    );
    expect(pushToUser).toHaveBeenCalledTimes(2);
  });

  it('waits for payment on InstaPay / Vodafone Cash orders', async () => {
    order = { ...order, paymentMethod: 'INSTAPAY', paymentStatus: 'UNPAID' };
    await notifySellersOfOrder('o1');
    expect(sendEmail).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();

    order = { ...order, paymentStatus: 'PAID' };
    await notifySellersOfOrder('o1');
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('does not notify a seller twice about the same order', async () => {
    alreadyNotified = new Set(['s1']);
    await notifySellersOfOrder('o1');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('s2@shop.test');
  });
});
