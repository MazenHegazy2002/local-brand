/**
 * @jest-environment node
 *
 * Unit tests for POST /api/admin/test-email
 *
 * Validates:
 *  - 403 when caller is not ADMIN
 *  - 503 when RESEND_API_KEY is not configured
 *  - 400 on missing / invalid "to" address
 *  - 200 with resendId on success (Resend API mocked)
 *  - 502 when Resend returns an error
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { POST } from '@/app/api/admin/test-email/route';

// ── next-auth server-side mock ────────────────────────────────────────────────
// The setup.ts only mocks next-auth/react; POST uses getServerSession from
// next-auth, so we mock it here at the module level.
jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}));

import { getServerSession } from 'next-auth';
const mockGetServerSession = getServerSession as jest.Mock<any>;

// ── fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn() as jest.Mock<ReturnType<typeof fetch>, Parameters<typeof fetch>>;
global.fetch = mockFetch as unknown as typeof fetch;

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

function resendOk(id = 're_abc123'): () => Promise<Response> {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify({ id }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
}

function resendError(message = 'Invalid API key'): () => Promise<Response> {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify({ message }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );
}

const RESEND_KEY = 're_test_key';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = RESEND_KEY;
  mockGetServerSession.mockResolvedValue(adminSession());
  mockFetch.mockImplementation(resendOk());
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
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

// ── RESEND_API_KEY guard ──────────────────────────────────────────────────────

describe('RESEND_API_KEY guard', () => {
  it('returns 503 when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makeRequest({ to: 'someone@test.com' }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/RESEND_API_KEY/i);
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe('input validation', () => {
  it('returns 400 when "to" is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
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
  it('returns 200 with success: true and resendId', async () => {
    mockFetch.mockImplementation(resendOk('re_testid_001'));
    const res = await POST(makeRequest({ to: 'ops@brandy.eg' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      resendId: string;
      to: string;
      sentAt: string;
    };
    expect(body.success).toBe(true);
    expect(body.resendId).toBe('re_testid_001');
    expect(body.to).toBe('ops@brandy.eg');
    expect(typeof body.sentAt).toBe('string');
  });

  it('calls Resend API with correct Authorization header', async () => {
    await POST(makeRequest({ to: 'ops@brandy.eg' }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${RESEND_KEY}`);
  });

  it('sends to the correct recipient', async () => {
    await POST(makeRequest({ to: 'recipient@test.com' }));
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { to: string };
    expect(sent.to).toBe('recipient@test.com');
  });
});

// ── Resend API error ──────────────────────────────────────────────────────────

describe('Resend API error handling', () => {
  it('returns 502 when Resend returns a non-ok status', async () => {
    mockFetch.mockImplementation(resendError('API key is invalid'));
    const res = await POST(makeRequest({ to: 'ops@brandy.eg' }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/API key is invalid/i);
  });
});
