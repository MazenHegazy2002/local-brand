import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { redis } from '@/lib/redis';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const ACCESS_TTL = 60 * 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json();
  if (!refreshToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  try {
    const { payload } = await jwtVerify(refreshToken, JWT_SECRET, { audience: 'mobile-refresh' });
    const { id, role, email } = payload as { id: string; role: string; email: string };

    // Fail closed: require stored token to exist AND match
    const stored = await redis?.get(`mobile:refresh:${id}`);
    if (!stored || stored !== refreshToken) {
      return NextResponse.json({ error: 'Token revoked' }, { status: 401 });
    }

    const accessToken = await new SignJWT({ id, role, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL}s`)
      .setAudience('mobile-access')
      .sign(JWT_SECRET);

    return NextResponse.json({ accessToken, expiresIn: ACCESS_TTL });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
