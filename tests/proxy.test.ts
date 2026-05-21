/**
 * @jest-environment node
 *
 * Tests the role-based access gates in `src/proxy.ts` (the file Next.js
 * loads as middleware via `proxy.ts → middleware.ts` re-export). The proxy
 * is the only place where ADMIN / SELLER / BUYER routing is enforced
 * before the page renders, so a regression here would let buyers walk
 * straight into /admin-os.
 *
 * NOTE: we use the global `jest` (not `import { jest } from '@jest/globals'`)
 * because the surrounding test infrastructure in `tests/setup.ts` does the
 * same. Mixing the two ends up giving you a `jest.fn()` that lacks
 * `mockReset`, which is a footgun this comment exists to head off.
 */

type MockFn = jest.Mock<any, any>;

jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn(async () => ({ limited: false, remaining: 60, reset: 0 })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getToken } = require('next-auth/jwt');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rateLimit } = require('@/lib/rateLimit');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { proxy } = require('@/proxy');

const getTokenMock = getToken as MockFn;
const rateLimitMock = rateLimit as MockFn;

function buildReq(pathname: string, headers: Record<string, string> = {}) {
  const url = `http://localhost:3000${pathname}`;
  // The proxy reads `req.nextUrl.pathname` and `req.headers`, then passes
  // `req.headers` into `NextResponse.next({ request: { headers } })` — Next
  // strictly requires a real `Headers` instance there.
  return {
    nextUrl: new URL(url),
    url,
    headers: new Headers(headers),
  } as any;
}

beforeEach(() => {
  getTokenMock.mockReset();
  rateLimitMock.mockReset();
  rateLimitMock.mockImplementation(async () => ({
    limited: false,
    remaining: 60,
    reset: 0,
  }));
});

describe('proxy — unauthenticated users', () => {
  it('redirects an unauthenticated visitor to /login when hitting /admin-os', async () => {
    getTokenMock.mockResolvedValue(null);

    const res = await proxy(buildReq('/admin-os/users'));

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('/login');
    expect(location).toContain('callbackUrl=%2Fadmin-os%2Fusers');
  });

  it('redirects to /login when hitting /seller-hub', async () => {
    getTokenMock.mockResolvedValue(null);

    const res = await proxy(buildReq('/seller-hub'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects to /login when hitting /dashboard', async () => {
    getTokenMock.mockResolvedValue(null);

    const res = await proxy(buildReq('/dashboard/orders'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('lets unauthenticated visitors browse public storefront pages', async () => {
    getTokenMock.mockResolvedValue(null);

    const res = await proxy(buildReq('/products/some-slug'));

    expect(res.status).toBe(200);
    // CSP gets stamped onto every passthrough response.
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('x-nonce')).toMatch(/.+/);
  });

  it('lets unauthenticated visitors browse the public affiliate page /sell', async () => {
    getTokenMock.mockResolvedValue(null);

    const res = await proxy(buildReq('/sell'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });
});

describe('proxy — role enforcement', () => {
  it('lets ADMIN users into /admin-os', async () => {
    getTokenMock.mockResolvedValue({ role: 'ADMIN', sub: 'admin-user-id' });

    const res = await proxy(buildReq('/admin-os/products'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('redirects SELLER users away from /admin-os to /seller-hub', async () => {
    getTokenMock.mockResolvedValue({ role: 'SELLER', sub: 'seller-user-id' });

    const res = await proxy(buildReq('/admin-os/products'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/seller-hub');
  });

  it('redirects BUYER users away from /admin-os to /dashboard', async () => {
    getTokenMock.mockResolvedValue({ role: 'BUYER', sub: 'buyer-user-id' });

    const res = await proxy(buildReq('/admin-os/products'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('redirects BUYER users away from /seller-hub to /dashboard', async () => {
    getTokenMock.mockResolvedValue({ role: 'BUYER', sub: 'buyer-user-id' });

    const res = await proxy(buildReq('/seller-hub'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('lets SELLER users into /seller-hub', async () => {
    getTokenMock.mockResolvedValue({ role: 'SELLER', sub: 'seller-user-id' });

    const res = await proxy(buildReq('/seller-hub'));

    expect(res.status).toBe(200);
  });

  it('lets ADMIN users into /seller-hub too (super-power)', async () => {
    getTokenMock.mockResolvedValue({ role: 'ADMIN', sub: 'admin-user-id' });

    const res = await proxy(buildReq('/seller-hub'));

    expect(res.status).toBe(200);
  });

  it('lets any logged-in user into /dashboard', async () => {
    getTokenMock.mockResolvedValue({ role: 'BUYER', sub: 'buyer-user-id' });

    const res = await proxy(buildReq('/dashboard'));

    expect(res.status).toBe(200);
  });

  it('lets buyer users browse the public affiliate page /sell', async () => {
    getTokenMock.mockResolvedValue({ role: 'BUYER', sub: 'buyer-user-id' });

    const res = await proxy(buildReq('/sell'));

    expect(res.status).toBe(200);
  });

  it('falls back to BUYER role when token has no role claim', async () => {
    getTokenMock.mockResolvedValue({ sub: 'no-role' });

    const adminRes = await proxy(buildReq('/admin-os'));
    expect(adminRes.status).toBe(307);
    expect(adminRes.headers.get('location')).toContain('/dashboard');

    const sellerRes = await proxy(buildReq('/seller-hub'));
    expect(sellerRes.status).toBe(307);
    expect(sellerRes.headers.get('location')).toContain('/dashboard');
  });
});

describe('proxy — rate limiting', () => {
  it('returns 429 with rate-limit headers when the limiter trips', async () => {
    rateLimitMock.mockResolvedValue({
      limited: true,
      remaining: 0,
      reset: 1234567890,
    });

    const res = await proxy(buildReq('/api/products'));

    expect(res.status).toBe(429);
    expect(res.headers.get('x-ratelimit-limit')).toBe('60');
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(res.headers.get('x-ratelimit-reset')).toBe('1234567890');
    const body = await res.json();
    expect(body.message).toMatch(/Too many requests/i);
  });

  it('does not invoke the rate limiter for /api/auth/session (NextAuth heartbeat)', async () => {
    getTokenMock.mockResolvedValue(null);
    await proxy(buildReq('/api/auth/session'));

    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it('does invoke the rate limiter for other API routes', async () => {
    getTokenMock.mockResolvedValue(null);
    await proxy(buildReq('/api/products'));

    expect(rateLimitMock).toHaveBeenCalledTimes(1);
  });
});

describe('proxy — public passthrough paths', () => {
  it('skips auth checks for /_next assets', async () => {
    const res = await proxy(buildReq('/_next/static/chunks/main.js'));
    expect(res.status).toBe(200);
    // No CSP attached here — these are static asset bypasses.
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it('skips auth checks for files with extensions (favicon.ico, etc.)', async () => {
    const res = await proxy(buildReq('/favicon.ico'));
    expect(res.status).toBe(200);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it('skips auth checks for /api/auth/* (NextAuth callbacks)', async () => {
    rateLimitMock.mockClear();
    const res = await proxy(buildReq('/api/auth/callback/credentials'));
    expect(res.status).toBe(200);
    expect(getTokenMock).not.toHaveBeenCalled();
  });
});

describe('proxy — CSP nonce attachment', () => {
  it('stamps a fresh nonce on every authenticated passthrough', async () => {
    getTokenMock.mockResolvedValue({ role: 'BUYER', sub: 'buyer' });

    const res1 = await proxy(buildReq('/dashboard'));
    const res2 = await proxy(buildReq('/dashboard'));

    const n1 = res1.headers.get('x-nonce');
    const n2 = res2.headers.get('x-nonce');
    expect(n1).toMatch(/.+/);
    expect(n2).toMatch(/.+/);
    expect(n1).not.toBe(n2);
  });

  it('declares strict-dynamic in script-src and locks form-action to self', async () => {
    getTokenMock.mockResolvedValue(null);

    const res = await proxy(buildReq('/products'));
    const csp = res.headers.get('content-security-policy') || '';

    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    // PaySky frame is on the allowlist.
    expect(csp).toContain('https://grey.paysky.io');
    // Stripe.js script is allowlisted.
    expect(csp).toContain('https://js.stripe.com');
  });
});
