/**
 * @jest-environment node
 *
 * sendEmailDetailed() over Custom SMTP (Admin OS → Settings → Email).
 *
 * Validates:
 *  - sends with the configured From
 *  - when the server refuses that From (Stalwart 501 5.5.4), retries from the login
 *  - other SMTP errors are reported, not retried
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

const settings: Record<string, unknown> = {};
jest.mock('@/lib/admin-settings-registry', () => ({
  getSetting: jest.fn(async (key: string) => settings[key] ?? ''),
}));
jest.mock('@/lib/secrets', () => ({ readSecret: (v: string) => v }));
jest.mock('fs', () => ({ appendFileSync: jest.fn() }));

const sendMail = jest.fn<Promise<unknown>, [{ from: string; to: string }]>();
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));

import { sendEmailDetailed } from '@/lib/email';

const MSG = { to: 'buyer@example.test', subject: 'Verify', html: '<p>hi</p>' };

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.RESEND_API_KEY;
  Object.assign(settings, {
    EMAIL_PROVIDER: 'smtp',
    EMAIL_FROM: 'noreply@brandyy.shop',
    EMAIL_FROM_NAME: 'Brandyy',
    SMTP_HOST: 'mail.brandyy.shop',
    SMTP_PORT: 465,
    SMTP_USER: 'admin@brandyy.shop',
    SMTP_PASS: 'secret',
    RESEND_API_KEY: '',
  });
});

describe('sendEmailDetailed over SMTP', () => {
  it('sends with the configured From', async () => {
    sendMail.mockResolvedValue({});
    const r = await sendEmailDetailed(MSG);
    expect(r).toEqual({ ok: true, provider: 'smtp' });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].from).toBe('"Brandyy" <noreply@brandyy.shop>');
  });

  it('retries from the login when the server refuses the From', async () => {
    sendMail
      .mockRejectedValueOnce(
        new Error('Mail command failed: 501 5.5.4 You are not allowed to send from this address.')
      )
      .mockResolvedValueOnce({});
    const r = await sendEmailDetailed(MSG);
    expect(r).toEqual({ ok: true, provider: 'smtp' });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[1][0].from).toBe('"Brandyy" <admin@brandyy.shop>');
    expect(sendMail.mock.calls[1][0].to).toBe('buyer@example.test');
  });

  it('reports other SMTP errors without retrying', async () => {
    sendMail.mockRejectedValue(new Error('Invalid login: 535 Authentication failed'));
    const r = await sendEmailDetailed(MSG);
    expect(r.ok).toBe(false);
    expect(r.provider).toBe('smtp');
    expect(r.error).toMatch(/authentication failed/i);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
