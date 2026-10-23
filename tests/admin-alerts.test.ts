/**
 * @jest-environment node
 *
 * notifyAdminEvent() — the admin alert every platform event sends.
 *
 * Validates:
 *  - emails mazenhegazy6@gmail.com plus extra addresses from the setting
 *  - escapes user-supplied text in the email
 *  - adds an in-app notification for ADMIN users
 *  - never throws when sending fails
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const settings: Record<string, unknown> = {};
jest.mock('@/lib/admin-settings-registry', () => ({
  getSetting: jest.fn(async (key: string) => settings[key] ?? ''),
}));

const sendEmailDetailed = jest.fn<
  Promise<{ ok: boolean; provider: string; error?: string }>,
  [{ to: string; subject: string; html: string }]
>();
jest.mock('@/lib/email', () => ({
  sendEmailDetailed: (o: { to: string; subject: string; html: string }) => sendEmailDetailed(o),
}));

const notifyMultiple = jest.fn<Promise<void>, [string[], Record<string, unknown>]>();
jest.mock('@/lib/notification-helpers', () => ({
  notifyMultiple: (ids: string[], n: Record<string, unknown>) => notifyMultiple(ids, n),
}));

const findMany = jest.fn<Promise<{ id: string }[]>, [unknown]>();
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: (a: unknown) => findMany(a) } },
}));

import { notifyAdminEvent, getAdminRecipientEmails } from '@/lib/admin-registration-alerts';

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(settings)) delete settings[k];
  sendEmailDetailed.mockResolvedValue({ ok: true, provider: 'smtp' });
  notifyMultiple.mockResolvedValue();
  findMany.mockResolvedValue([{ id: 'admin-1' }]);
});

describe('getAdminRecipientEmails', () => {
  it('always includes mazenhegazy6@gmail.com', async () => {
    expect(await getAdminRecipientEmails()).toEqual(['mazenhegazy6@gmail.com']);
  });

  it('adds valid extra addresses from the setting, without duplicates', async () => {
    settings.ADMIN_NOTIFICATION_EMAIL = 'ops@brandyy.shop, MAZENHEGAZY6@gmail.com; not-an-email';
    expect(await getAdminRecipientEmails()).toEqual(['mazenhegazy6@gmail.com', 'ops@brandyy.shop']);
  });
});

describe('notifyAdminEvent', () => {
  const event = {
    icon: '↩️',
    title: 'Return requested: Linen shirt',
    summary: 'buyer@example.test asked to return an item.',
    details: { Reason: '<script>alert(1)</script>', Empty: '' },
    link: '/admin-os?tab=orders',
  };

  it('emails the admin and adds an in-app notification', async () => {
    await notifyAdminEvent(event);

    expect(sendEmailDetailed).toHaveBeenCalledTimes(1);
    const mail = sendEmailDetailed.mock.calls[0][0];
    expect(mail.to).toBe('mazenhegazy6@gmail.com');
    expect(mail.subject).toBe('↩️ Return requested: Linen shirt');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('>Empty<');
    expect(mail.html).toContain('/admin-os?tab=orders');

    expect(notifyMultiple).toHaveBeenCalledWith(['admin-1'], {
      title: event.title,
      message: event.summary,
      link: event.link,
      save: true,
    });
  });

  it('skips the in-app notification when asked', async () => {
    await notifyAdminEvent({ ...event, inApp: false });
    expect(sendEmailDetailed).toHaveBeenCalledTimes(1);
    expect(notifyMultiple).not.toHaveBeenCalled();
  });

  it('does not throw when sending fails', async () => {
    sendEmailDetailed.mockRejectedValue(new Error('SMTP down'));
    findMany.mockRejectedValue(new Error('DB down'));
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(notifyAdminEvent(event)).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
