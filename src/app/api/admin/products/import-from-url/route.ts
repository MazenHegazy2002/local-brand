import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { importWebsiteForSeller, requestImport } from '@/lib/website-import-run';

export const maxDuration = 300;

const isStaff = (role?: string) => role === 'ADMIN' || role === 'CO_ADMIN';

// GET  /api/admin/products/import-from-url → every seller (for the picker)
//      and the latest import requests
// POST /api/admin/products/import-from-url { url, sellerId }
//      admin    → copies the website's products into that seller's store now
//      co-admin → creates a request an admin has to approve

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sellers = await prisma.sellerProfile.findMany({
    select: { id: true, storeName: true, status: true, user: { select: { email: true } } },
    orderBy: { storeName: 'asc' },
  });
  const requests = await prisma.productImportRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  const names = new Map(sellers.map(s => [s.id, s.storeName]));
  return NextResponse.json({
    sellers,
    canApprove: user.role === 'ADMIN',
    requests: requests.map(r => ({ ...r, storeName: names.get(r.sellerId) ?? '—' })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { windowMs: 60 * 60 * 1000, maxRequests: 20 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many imports. Please try again in an hour.' },
      { status: 429 }
    );
  }

  const { url, sellerId } = (await req.json().catch(() => ({}))) as {
    url?: string;
    sellerId?: string;
  };
  if (!url || typeof url !== 'string' || url.length > 500) {
    return NextResponse.json({ error: 'Enter the website link.' }, { status: 400 });
  }
  if (!sellerId || typeof sellerId !== 'string') {
    return NextResponse.json({ error: 'Choose a seller.' }, { status: 400 });
  }

  if (user.role === 'CO_ADMIN') {
    const out = await requestImport({
      sellerId,
      url,
      requestedById: user.id,
      requestedRole: 'CO_ADMIN',
    });
    return out.ok
      ? NextResponse.json({ pending: true, alreadyPending: out.alreadyPending })
      : NextResponse.json({ error: out.error }, { status: out.status });
  }

  const staff = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
  const who = `Admin ${staff?.email ?? user.id}`;
  const out = await importWebsiteForSeller({ sellerId, url, startedBy: who });
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });

  await prisma.auditLog
    .create({
      data: {
        adminId: user.id,
        action: 'IMPORT_PRODUCTS_FROM_WEBSITE',
        targetId: sellerId,
        details: JSON.stringify({ url, created: out.result.created }),
      },
    })
    .catch(() => {});

  return NextResponse.json(out.result);
}
