import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { rateLimit } from '@/lib/rateLimit';
import { importWebsiteForSeller } from '@/lib/website-import-run';

export const maxDuration = 300;

/**
 * POST /api/products/import-from-url  { url }
 *
 * Copies every product on a seller's old website into their own catalogue
 * as drafts (see importWebsiteForSeller). The seller reviews them and
 * publishes each one from Seller Hub > Products.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser)?.role !== 'SELLER') {
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
    where: { userId: (session.user as SessionUser).id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const out = await importWebsiteForSeller({ sellerId: profile.id, url });
  return out.ok
    ? NextResponse.json(out.result)
    : NextResponse.json({ error: out.error }, { status: out.status });
}
