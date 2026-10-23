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

const sendMail = jest.fn<
  Promise<unknown>,
  [{ from: string; to: string; text?: string; replyTo?: string }]
>();
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));

import { sendEmailDetailed, htmlToText, withLogo } from '@/lib/email';

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
    // Plain-text part + Reply-To: HTML-only mail scores worse with spam filters.
    expect(sendMail.mock.calls[0][0].text).toBe('hi');
    expect(sendMail.mock.calls[0][0].replyTo).toBe('support@brandyy.shop');
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

describe('htmlToText', () => {
  it('keeps link targets, line breaks and decodes entities', () => {
    const html =
      '<style>p{color:red}</style><h1>Verify</h1><p>Hi Omar &amp; team,<br>click ' +
      '<a href="https://brandyy.shop/v?t=1">Verify email</a></p>';
    expect(htmlToText(html)).toBe(
      'Verify\nHi Omar & team,\nclick Verify email (https://brandyy.shop/v?t=1)'
    );
  });
});

describe('withLogo', () => {
  it('adds the logo once, after <body> when there is one', () => {
    const doc = withLogo('<html><body style="x"><p>Hi</p></body></html>');
    expect(doc).toMatch(/<body style="x"><div[^>]*><img src="[^"]*\/email-logo\.png"/);
    expect(withLogo(doc)).toBe(doc);
  });

  it('puts the logo first in a fragment', () => {
    expect(withLogo('<p>Hi</p>')).toMatch(
      /^<div[^>]*><img [^>]*email-logo\.png[^>]*\/><\/div><p>Hi<\/p>$/
    );
  });
});
