/**
 * CSRF protection — double-submit cookie pattern.
 *
 * Flow:
 *   1. Middleware issues a `csrf-token` cookie (non-HttpOnly so JS can read it)
 *      on every response to a non-API page route.
 *   2. On POST / PATCH / PUT / DELETE to /api/*, middleware verifies that the
 *      `X-CSRF-Token` request header matches the cookie value.
 *   3. Client-side code reads the cookie and attaches it as a header via the
 *      `csrfFetch` helper or `useCsrfHeaders()`.
 *
 * Webhook routes (/api/webhooks/[all], /api/payment/[gw]/callback) are exempted
 * because they are called by third-party servers that cannot supply a cookie.
 *
 * The token is a random UUID — 128 bits of entropy, regenerated once per
 * browser session (expiry: 1 day) and rotated on login/logout by the auth
 * layer clearing the cookie.
 */

export const CSRF_COOKIE = 'csrf-token';
export const CSRF_HEADER = 'x-csrf-token';

/** Generate a 32-hex-char random token (edge-compatible). */
export function generateCsrfToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true only if both strings are identical.
 */
export function validateCsrfTokens(cookieToken: string, headerToken: string): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  const a = new TextEncoder().encode(cookieToken);
  const b = new TextEncoder().encode(headerToken);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Routes that are called by external servers and MUST be exempt from CSRF.
 * Stripe/PaySky/Paymob/Fawry send POST requests without our cookie.
 */
export const CSRF_EXEMPT_PREFIXES = [
  '/api/auth',
  '/api/webhooks',
  '/api/payment/paysky/callback',
  '/api/payment/paymob',
  '/api/payment/fawry',
  '/api/admin/seed-catalog',
];

export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

// ─── Client-side helpers ──────────────────────────────────────────────────

/** Read the csrf-token cookie value in a browser context. */
export function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Drop-in replacement for `fetch` that automatically attaches the CSRF header
 * on state-mutating methods.
 *
 * Usage:
 *   import { csrfFetch } from '@/lib/csrf';
 *   const res = await csrfFetch('/api/admin/flash-sales', { method: 'POST', ... });
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (mutating) {
    const token = readCsrfCookie();
    init = {
      ...init,
      headers: {
        ...init.headers,
        [CSRF_HEADER]: token,
      },
    };
  }

  return fetch(input, init);
}
