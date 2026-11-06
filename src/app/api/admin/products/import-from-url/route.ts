import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { importWebsiteForSeller } from '@/lib/website-import-run';

export const maxDuration = 300;

const isStaff = (role?: string) => role === 'ADMIN' || role === 'CO_ADMIN';

// GET  /api/admin/products/import-from-url → every seller, for the picker
// POST /api/admin/products/import-from-url { url, sellerId }
//      → copies the website's products into that seller's store as drafts.
// Admins and co-admins only.

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sellers = await prisma.sellerProfile.findMany({
    select: { id: true, storeName: true, status: true, user: { select: { email: true } } },
    orderBy: { storeName: 'asc' },
  });
  return NextResponse.json({ sellers });
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

  const staff = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
  const who = `${user.role === 'CO_ADMIN' ? 'Co-admin' : 'Admin'} ${staff?.email ?? user.id}`;
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
