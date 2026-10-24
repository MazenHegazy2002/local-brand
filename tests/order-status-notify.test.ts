/**
 * @jest-environment node
 *
 * triggerOrderStatusEmail — besides the email, a signed-up buyer gets the update in the
 * app's notifications list and as a push on their phone.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('fs', () => ({ ...jest.requireActual('fs'), appendFileSync: jest.fn() }));
jest.mock('@/lib/admin-settings-registry', () => ({ getSetting: jest.fn(async () => '') }));

let order: Record<string, unknown> | null;
jest.mock('@/lib/prisma', () => ({
  prisma: { order: { findUnique: jest.fn(async () => order) } },
}));

const notifyUser = jest.fn<Promise<void>, [Record<string, unknown>]>();
const pushToUser = jest.fn<Promise<void>, [string, string, string, string?]>();
jest.mock('@/lib/notification-helpers', () => ({
  notifyUser: (o: Record<string, unknown>) => notifyUser(o),
  pushToUser: (u: string, t: string, b: string, l?: string) => pushToUser(u, t, b, l),
}));

import { triggerOrderStatusEmail } from '@/lib/email';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  order = {
    id: '4bfa47ee-f9f5-4e20-85de-4febc341f371',
    userId: 'u1',
    user: { email: 'buyer@example.test', name: 'Omar' },
    items: [],
    totalAmount: 472.46,
    createdAt: new Date(),
  };
});

describe('triggerOrderStatusEmail app notifications', () => {
  it('notifies the buyer in the app and by push when the order ships', async () => {
    await triggerOrderStatusEmail(order!.id as string, 'SHIPPED');
    expect(notifyUser).toHaveBeenCalledWith({
      userId: 'u1',
      title: 'Your order shipped 🚚',
      message: '#4BFA47EE is on its way.',
      link: '/order/4bfa47ee-f9f5-4e20-85de-4febc341f371',
    });
    expect(pushToUser).toHaveBeenCalledWith(
      'u1',
      'Your order shipped 🚚',
      '#4BFA47EE is on its way.',
      '/order/4bfa47ee-f9f5-4e20-85de-4febc341f371'
    );
  });

  it('skips app notifications for guest orders', async () => {
    order = { ...order, userId: null, user: null, guestEmail: 'guest@example.test' };
    await triggerOrderStatusEmail(order.id as string, 'DELIVERED');
    expect(notifyUser).not.toHaveBeenCalled();
    expect(pushToUser).not.toHaveBeenCalled();
  });

  it('sends nothing for statuses without a message', async () => {
    await triggerOrderStatusEmail(order!.id as string, 'PROCESSING');
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
