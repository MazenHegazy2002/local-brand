import { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE, generateCsrfToken } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/csrf
 *
 * Returns the current CSRF token from the request cookie, issuing a new one
 * if the cookie is absent. Useful for server-rendered pages that need to
 * embed the token in a form, or for non-browser clients in development.
 *
 * Response: { csrfToken: string }
 */
export async function GET(req: NextRequest) {
  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  const token = existing ?? generateCsrfToken();

  const res = NextResponse.json({ csrfToken: token });

  if (!existing) {
    const isDev = process.env.NODE_ENV !== 'production';
    res.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: !isDev,
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  return res;
}
