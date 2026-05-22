/**
 * GET  /api/admin/seo  — returns last sitemap ping timestamps
 * POST /api/admin/seo  — pings Google + Bing sitemap submission URLs
 *
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lolozozo.shop';
const SITEMAP_URL = `${APP_URL}/sitemap.xml`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [googleRow, bingRow] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { key: 'seo_google_ping_at' } }),
    prisma.systemSettings.findUnique({ where: { key: 'seo_bing_ping_at' } }),
  ]);

  return NextResponse.json({
    sitemapUrl: SITEMAP_URL,
    googleLastPingedAt: googleRow?.value ?? null,
    bingLastPingedAt: bingRow?.value ?? null,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();

  async function ping(engine: 'google' | 'bing') {
    const url =
      engine === 'google'
        ? `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
        : `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      return { ok: res.ok, status: res.status, url };
    } catch (e) {
      return { ok: false, status: 0, url, error: (e as Error).message };
    }
  }

  const [google, bing] = await Promise.all([ping('google'), ping('bing')]);

  // Persist timestamps
  await Promise.all([
    prisma.systemSettings.upsert({
      where: { key: 'seo_google_ping_at' },
      create: { key: 'seo_google_ping_at', value: now, description: 'Last Google sitemap ping' },
      update: { value: now },
    }),
    prisma.systemSettings.upsert({
      where: { key: 'seo_bing_ping_at' },
      create: { key: 'seo_bing_ping_at', value: now, description: 'Last Bing sitemap ping' },
      update: { value: now },
    }),
  ]);

  return NextResponse.json({
    sitemapUrl: SITEMAP_URL,
    pinnedAt: now,
    google,
    bing,
  });
}
