import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { issueMobileTokens } from '@/lib/mobile-tokens';
import { rateLimit } from '@/lib/rateLimit';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
  if (rl.limited) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });

  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

  // Case-insensitive: older sign-ups stored the email exactly as typed.
  const user = await prisma.user.findFirst({
    where: { email: { equals: String(email).trim(), mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      avatarUrl: true,
      emailVerified: true,
      deletedAt: true,
    },
  });

  if (
    !user?.passwordHash ||
    user.deletedAt ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Same rule as the website: the email link must be clicked before signing in.
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', email: user.email },
      { status: 403 }
    );
  }

  return NextResponse.json(await issueMobileTokens(user));
}
