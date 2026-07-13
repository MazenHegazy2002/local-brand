// GET /api/admin/health  — system health snapshot for the admin Health tab
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { listRegisteredHooks } from '@/lib/plugin-hooks';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

async function checkDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const t = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - t };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return { ok: false, latencyMs: -1 };
  }
  const t = Date.now();
  try {
    const pong = await redis.ping();
    return { ok: pong === 'PONG', latencyMs: Date.now() - t };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const since24h = new Date(Date.now() - 86_400_000);

  const [db, redisCheck, pluginsFailed, jobsFailed, webhookErrors, orderStats] = await Promise.all([
    checkDb(),
    checkRedis(),
    prisma.plugin.count({ where: { lastTestOk: false } }),
    prisma.jobLog.count({ where: { status: 'failed', createdAt: { gte: since24h } } }),
    prisma.webhookLog.count({ where: { status: 'error', receivedAt: { gte: since24h } } }),
    prisma.order.aggregate({
      _count: { _all: true },
      where: { createdAt: { gte: since24h } },
    }),
  ]);

  const emailOk = Boolean(
    process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.SENDGRID_API_KEY
  );

  const paymentGateways = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    paysky: Boolean(process.env.PAYSKY_MERCHANT_ID),
    paymob: Boolean(process.env.PAYMOB_API_KEY),
    fawry: Boolean(process.env.FAWRY_MERCHANT_CODE),
  };

  const configuredGateways = Object.values(paymentGateways).filter(Boolean).length;

  const hooks = listRegisteredHooks();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: {
      database: db,
      redis: redisCheck,
      email: { ok: emailOk },
      paymentGateways: {
        ok: configuredGateways > 0,
        configured: configuredGateways,
        detail: paymentGateways,
      },
    },
    metrics: {
      pluginTestFailures: pluginsFailed,
      jobFailures24h: jobsFailed,
      webhookErrors24h: webhookErrors,
      orders24h: orderStats._count._all,
    },
    pluginHooks: hooks,
    env: {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || '(not set — canonical URLs broken)',
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
