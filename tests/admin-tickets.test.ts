/**
 * @jest-environment node
 *
 * /api/admin/tickets — admins can close and delete support tickets.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

let role = 'ADMIN';
jest.mock('@/lib/mobile-auth', () => ({
  getRequestSession: jest.fn(async () => ({ user: { id: 'a1', role } })),
}));

const deleteMany = jest.fn<Promise<{ count: number }>, [unknown]>();
const findUnique = jest.fn<Promise<{ id: string } | null>, [unknown]>();
const update = jest.fn<Promise<Record<string, unknown>>, [unknown]>();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    supportTicket: {
      deleteMany: (a: unknown) => deleteMany(a),
      findUnique: (a: unknown) => findUnique(a),
      update: (a: unknown) => update(a),
    },
  },
}));

jest.mock('@/generated/client', () => ({
  TicketStatus: {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
  },
}));

import { DELETE, PATCH } from '@/app/api/admin/tickets/route';

const url = 'https://brandyy.shop/api/admin/tickets';

beforeEach(() => {
  jest.clearAllMocks();
  role = 'ADMIN';
});

describe('DELETE /api/admin/tickets', () => {
  it('deletes the ticket', async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(new Request(`${url}?id=t1`, { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('returns 404 for an unknown ticket', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    const res = await DELETE(new Request(`${url}?id=nope`, { method: 'DELETE' }));
    expect(res.status).toBe(404);
  });

  it('rejects non-admins', async () => {
    role = 'SELLER';
    const res = await DELETE(new Request(`${url}?id=t1`, { method: 'DELETE' }));
    expect(res.status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/admin/tickets', () => {
  it('closes the ticket', async () => {
    findUnique.mockResolvedValue({ id: 't1' });
    update.mockResolvedValue({ id: 't1', status: 'CLOSED' });
    const res = await PATCH(
      new Request(url, { method: 'PATCH', body: JSON.stringify({ id: 't1', status: 'CLOSED' }) })
    );
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'CLOSED' } });
  });
});
