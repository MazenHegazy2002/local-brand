import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { rateLimit } from '@/lib/rateLimit';
import { findOrCreateGoogleUser } from '@/lib/oauth-user';
import { issueMobileTokens } from '@/lib/mobile-tokens';

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
// The iPhone app's bundle ID is the audience of tokens from native Sign in with Apple.
const APPLE_AUDIENCE = (process.env.APPLE_BUNDLE_IDS || 'shop.brandyy.app')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST /api/auth/mobile/apple { identityToken, name? } — Sign in with Apple from the iPhone app.
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { windowMs: 15 * 60 * 1000, maxRequests: 20 });
  if (rl.limited) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const { identityToken, name } = await req.json().catch(() => ({}));
  if (!identityToken) return NextResponse.json({ error: 'Missing identityToken' }, { status: 400 });

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(String(identityToken), APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: APPLE_AUDIENCE,
    }));
  } catch {
    return NextResponse.json({ error: 'Invalid Apple token' }, { status: 401 });
  }
  // Apple only includes the email when the user shares it (real or private relay address).
  if (!claims.email) {
    return NextResponse.json({ error: 'Apple did not share an email address' }, { status: 401 });
  }

  const user = await findOrCreateGoogleUser({
    email: String(claims.email),
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
  });
  if (!user) return NextResponse.json({ error: 'This account was deleted' }, { status: 403 });

  return NextResponse.json(await issueMobileTokens(user));
}
