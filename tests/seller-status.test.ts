/**
 * @jest-environment node
 *
 * setSellerStatus — approving a seller (web Admin OS or the app) emails them,
 * verifies their email and leaves an audit entry; suspending only audits.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const profile = {
  id: 's1',
  userId: 'u1',
  storeName: 'Nile <Crafts>',
  user: { email: 'seller@example.test', name: 'Omar', emailVerified: null },
};
const sellerUpdate = jest.fn(async (_args?: any) => profile);
const userUpdate = jest.fn(async (_args?: any) => ({}));
const auditCreate = jest.fn(async (_args?: any) => ({}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sellerProfile: { update: (a: unknown) => sellerUpdate(a) },
    user: { update: (a: unknown) => userUpdate(a) },
    auditLog: { create: (a: unknown) => auditCreate(a) },
  },
}));
const sendEmail = jest.fn<Promise<boolean>, [{ to: string; subject: string; html: string }]>(
  async () => true
);
jest.mock('@/lib/email', () => ({
  sendEmail: (o: { to: string; subject: string; html: string }) => sendEmail(o),
}));

import { setSellerStatus } from '@/lib/seller-status';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('setSellerStatus', () => {
  it('approval emails the seller, verifies them and audits', async () => {
    await setSellerStatus('s1', 'ACTIVE', 'admin1');
    expect(sellerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: { status: 'ACTIVE' } })
    );
    expect(userUpdate).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('seller@example.test');
    expect(mail.subject).toBe('Your Brandyy seller account has been approved!');
    expect(mail.html).toContain('Nile &lt;Crafts&gt;');
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'admin1',
        action: 'APPROVED_SELLER',
        targetId: 's1',
      }),
    });
  });

  it('suspending does not email the seller', async () => {
    await setSellerStatus('s1', 'SUSPENDED', 'admin1');
    expect(sendEmail).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'SUSPENDED_SELLER' }),
    });
  });
});
