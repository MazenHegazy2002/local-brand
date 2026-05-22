import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { version } from '@/../package.json';

// Liveness + dependency probe. Returns 200 when DB, Redis, and the
// configured image host are all reachable, otherwise 503. The storage check
// is skipped when no storage backend is configured (e.g. local dev with
// the base64 data-URL fallback) — that's expected, not a failure.
export async function GET() {
  const checks: {
    status: 'ok' | 'degraded';
    version: string;
    timestamp: string;
    uptime: number;
    database: 'connected' | 'disconnected' | 'unknown';
    redis: 'connected' | 'disconnected' | 'unknown';
    storage: 'configured' | 'unconfigured' | 'error';
  } = {
    status: 'ok',
    version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
    redis: 'unknown',
    storage: 'unconfigured',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
    checks.status = 'degraded';
  }

  try {
    await redis.ping();
    checks.redis = 'connected';
  } catch {
    checks.redis = 'disconnected';
    checks.status = 'degraded';
  }

  // Storage check — we don't want to actually upload bytes here, just verify
  // the credentials are present so missing env vars get flagged early.
  // Vercel Blob is preferred; Cloudinary is the documented fallback.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    checks.storage = 'configured';
  } else if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    checks.storage = 'configured';
  } else if (process.env.NODE_ENV === 'production') {
    // In production a missing image host is a real degradation — uploads
    // will fall through to the base64 data-URL path which bloats the DB.
    checks.storage = 'unconfigured';
    checks.status = 'degraded';
  } else {
    // Dev / staging — base64 fallback is fine.
    checks.storage = 'unconfigured';
  }

  const status = checks.status === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status });
}
