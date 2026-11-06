import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { requestImport } from '@/lib/website-import-run';

/**
 * GET  /api/products/import-from-url → the seller's import requests
 * POST /api/products/import-from-url  { url } → asks an admin to import the
 *      products on the seller's old website. Once approved they land in the
 *      seller's catalogue as drafts to review and publish.
 */
// Works with the website session and the app's Bearer token.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || user.role !== 'SELLER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ requests: [] });
  const requests = await prisma.productImportRequest.findMany({
    where: { sellerId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, url: true, status: true, result: true, createdAt: true },
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || user.role !== 'SELLER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { windowMs: 60 * 60 * 1000, maxRequests: 5 });
  if (rl.limited) {
    return NextResponse.json(
      { error: 'Too many imports. Please try again in an hour.' },
      { status: 429 }
    );
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || typeof url !== 'string' || url.length > 500) {
    return NextResponse.json({ error: 'Enter your website link.' }, { status: 400 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const out = await requestImport({
    sellerId: profile.id,
    url,
    requestedById: user.id,
    requestedRole: 'SELLER',
  });
  return out.ok
    ? NextResponse.json({ pending: true, alreadyPending: out.alreadyPending })
    : NextResponse.json({ error: out.error }, { status: out.status });
}
