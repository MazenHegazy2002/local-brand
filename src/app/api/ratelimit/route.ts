import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// Rate limiting constants
const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 30;

async function rateLimit(key: string): Promise<{ success: boolean; remaining: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - current);
  return { success: current <= MAX_REQUESTS_PER_WINDOW, remaining };
}

// For login brute-force specifically, stricter limits
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const { success, remaining } = await rateLimit(`rate_limit:${ip}`);

  if (!success) {
    return NextResponse.json({ message: 'Too many requests. Please slow down.' }, {
      status: 429,
      headers: { 'Retry-After': String(WINDOW_SECONDS), 'X-RateLimit-Remaining': '0' }
    });
  }

  return NextResponse.json({ ok: true, remaining }, { status: 200 });
}
