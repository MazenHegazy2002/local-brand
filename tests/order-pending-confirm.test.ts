/**
 * @jest-environment node
 *
 * New orders start PENDING; when every live item is accepted (CONFIRMED) by the
 * seller or an admin, the order becomes CONFIRMED.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

let order: { id: string; status: string; items: { status: string }[] };
const orderUpdate = jest.fn(async (_a: unknown) => ({}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    orderItem: {
      update: jest.fn(async () => ({
        sellerNameSnapshot: 'S',
        productTitleSnapshot: 'P',
        quantity: 1,
        order,
      })),
    },
    order: { update: (a: unknown) => orderUpdate(a) },
  },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/admin-registration-alerts', () => ({ notifyAdminEvent: jest.fn() }));

import { updateOrderItemStatusCore } from '@/lib/seller-core';

const admin = { id: 'a1', role: 'ADMIN' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('confirming a pending order', () => {
  it('confirms the order once every item is accepted', async () => {
    order = {
      id: 'o1',
      status: 'PENDING',
      items: [{ status: 'CONFIRMED' }, { status: 'CANCELLED' }],
    };
    await updateOrderItemStatusCore(admin, 'i1', 'CONFIRMED');
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('stays pending while another item is still waiting', async () => {
    order = {
      id: 'o1',
      status: 'PENDING',
      items: [{ status: 'CONFIRMED' }, { status: 'PENDING' }],
    };
    await updateOrderItemStatusCore(admin, 'i1', 'CONFIRMED');
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('lets a co-admin confirm', async () => {
    order = { id: 'o1', status: 'PENDING', items: [{ status: 'CONFIRMED' }] };
    const res = await updateOrderItemStatusCore({ id: 'c1', role: 'CO_ADMIN' }, 'i1', 'CONFIRMED');
    expect(res.error).toBeUndefined();
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'CONFIRMED' },
    });
  });
});
