/**
 * @jest-environment node
 *
 * Unit tests for POST /api/admin/test-email
 *
 * Validates:
 *  - 403 when caller is not ADMIN
 *  - 503 when no email provider is configured
 *  - 400 on missing / invalid "to" address
 *  - 200 with the provider used on success (sendEmailDetailed mocked)
 *  - 502 when the provider rejects the message
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { POST } from '@/app/api/admin/test-email/route';

// ── next-auth server-side mock ────────────────────────────────────────────────
// The setup.ts only mocks next-auth/react; POST uses getServerSession from
// next-auth, so we mock it here at the module level.
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}));

// ── email sender mock ─────────────────────────────────────────────────────────
// The route sends through whichever provider Admin OS has set (SMTP or Resend).
jest.mock('@/lib/email', () => ({
  sendEmailDetailed: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { sendEmailDetailed } from '@/lib/email';
const mockGetServerSession = getServerSession as jest.Mock<any>;
const mockSend = sendEmailDetailed as jest.Mock<any>;

// ── helpers ───────────────────────────────────────────────────────────────────

function adminSession() {
  return { user: { role: 'ADMIN', email: 'admin@brandy.eg' } };
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/test-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(adminSession());
  mockSend.mockResolvedValue({ ok: true, provider: 'smtp' });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('auth', () => {
  it('returns 403 when session is null (unauthenticated)', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ to: 'buyer@test.com' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for a non-ADMIN role (BUYER)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'BUYER' } });
    const res = await POST(makeRequest({ to: 'buyer@test.com' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for SELLER role', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'SELLER' } });
    const res = await POST(makeRequest({ to: 'seller@test.com' }));
    expect(res.status).toBe(403);
  });
});

// ── No provider configured ────────────────────────────────────────────────────

describe('no provider configured', () => {
  it('returns 503 with the reason', async () => {
    mockSend.mockResolvedValue({
      ok: false,
      provider: 'none',
      error: 'No email provider configured.',
    });
    const res = await POST(makeRequest({ to: 'someone@test.com' }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/no email provider/i);
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe('input validation', () => {
  it('returns 400 when "to" is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 400 when "to" is not a valid email (no @)', async () => {
    const res = await POST(makeRequest({ to: 'notanemail' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when "to" is an empty string', async () => {
    const res = await POST(makeRequest({ to: '' }));
    expect(res.status).toBe(400);
  });
});

// ── Successful send ───────────────────────────────────────────────────────────

describe('successful send', () => {
  it('returns 200 with success: true and the provider used', async () => {
    const res = await POST(makeRequest({ to: 'ops@brandy.eg' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      provider: string;
      to: string;
      sentAt: string;
    };
    expect(body.success).toBe(true);
    expect(body.provider).toBe('smtp');
    expect(body.to).toBe('ops@brandy.eg');
    expect(typeof body.sentAt).toBe('string');
  });

  it('sends to the correct recipient', async () => {
    await POST(makeRequest({ to: 'recipient@test.com' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [opts] = mockSend.mock.calls[0] as [{ to: string; subject: string }];
    expect(opts.to).toBe('recipient@test.com');
    expect(opts.subject).toMatch(/test email/i);
  });
});

// ── Provider error ────────────────────────────────────────────────────────────

describe('provider error handling', () => {
  it('returns 502 with the provider error', async () => {
    mockSend.mockResolvedValue({
      ok: false,
      provider: 'smtp',
      error: 'Invalid login: 535 Authentication failed',
    });
    const res = await POST(makeRequest({ to: 'ops@brandy.eg' }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/authentication failed/i);
  });
});
