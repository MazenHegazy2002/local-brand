/**
 * @jest-environment node
 *
 * The app signs in with a Bearer token, so /api/reviews and /api/rma must accept
 * getRequestSession (cookie or token), not only the web cookie session.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

let session: { user: { id: string; role: string; email?: string } } | null = null;
const getRequestSession = jest.fn(async (_req: Request) => session);
jest.mock('@/lib/mobile-auth', () => ({
  getRequestSession: (req: Request) => getRequestSession(req),
}));
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/admin-registration-alerts', () => ({ notifyAdminEvent: jest.fn() }));

import { POST as postReview } from '@/app/api/reviews/route';
import { POST as postReturn } from '@/app/api/rma/route';

const req = (url: string) =>
  new Request(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer app-token' },
    body: JSON.stringify({}),
  });

beforeEach(() => {
  jest.clearAllMocks();
  session = null;
});

describe.each([
  ['POST /api/reviews', postReview, 'https://brandyy.shop/api/reviews'],
  ['POST /api/rma', postReturn, 'https://brandyy.shop/api/rma'],
])('%s', (_name, handler, url) => {
  it('passes the request (with its Bearer token) to getRequestSession', async () => {
    await handler(req(url));
    expect(getRequestSession).toHaveBeenCalledTimes(1);
    expect(getRequestSession.mock.calls[0][0].headers.get('authorization')).toBe(
      'Bearer app-token'
    );
  });

  it('rejects a request with no session', async () => {
    expect((await handler(req(url))).status).toBe(401);
  });

  it('lets a signed-in app user through to validation', async () => {
    session = { user: { id: 'u1', role: 'BUYER', email: 'buyer@example.test' } };
    expect((await handler(req(url))).status).toBe(400);
  });
});
