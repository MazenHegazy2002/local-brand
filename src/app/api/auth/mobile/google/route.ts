import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { rateLimit } from '@/lib/rateLimit';
import { findOrCreateGoogleUser } from '@/lib/oauth-user';
import { issueMobileTokens } from '@/lib/mobile-tokens';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST /api/auth/mobile/google { idToken } — the app's native Google sign-in
// returns an ID token issued for our web client ID; verify it and sign in or
// create the account.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { windowMs: 15 * 60 * 1000, maxRequests: 20 });
  if (rl.limited) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience)
    return NextResponse.json({ error: 'Google sign-in is not configured' }, { status: 503 });

  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(String(idToken), GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience,
    }));
  } catch {
    return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
  }
  if (!claims.email || claims.email_verified !== true) {
    return NextResponse.json({ error: 'Google account email is not verified' }, { status: 401 });
  }

  const user = await findOrCreateGoogleUser({
    email: String(claims.email),
    name: claims.name ? String(claims.name) : null,
    image: claims.picture ? String(claims.picture) : null,
  });
  if (!user) return NextResponse.json({ error: 'This account was deleted' }, { status: 403 });

  return NextResponse.json(await issueMobileTokens(user));
}
