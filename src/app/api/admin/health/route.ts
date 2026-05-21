// Admin health check — DB / Redis / email / payments connectivity.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

async function timed<T>(
  fn: () => Promise<T>
): Promise<{ ok: boolean; latencyMs: number; message?: string }> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const e = err as Error;
    return { ok: false, latencyMs: Date.now() - start, message: e.message };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [db, redisStatus] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    timed(() => redis.ping()),
  ]);

  return NextResponse.json({
    db,
    redis: redisStatus,
    email: {
      configured: !!process.env.RESEND_API_KEY,
      provider: process.env.RESEND_API_KEY ? 'resend' : 'none',
    },
    stripe: { configured: !!process.env.STRIPE_SECRET_KEY },
    paysky: { configured: !!process.env.PAYSKY_MERCHANT_ID },
  });
}
