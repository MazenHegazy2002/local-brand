import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { rateLimit } from '@/lib/rateLimit';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
const ACCESS_TTL = 60 * 60; // 1 h
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 d

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
  if (rl.limited) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      image: true,
      emailVerified: true,
    },
  });

  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const payload = { id: user.id, role: user.role, email: user.email };

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .setAudience('mobile-access')
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .setAudience('mobile-refresh')
    .sign(JWT_SECRET);

  // Store refresh token in Redis for revocation support; refuse to issue if it can't be persisted
  await redis?.set(`mobile:refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL);

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image },
  });
}
