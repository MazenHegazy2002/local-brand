// Admin Pages API.
//
// GET    /api/admin/pages         — list (filter by status via ?status=)
// POST   /api/admin/pages         — create
// PATCH  /api/admin/pages         — update one (body must include `id`)
// DELETE /api/admin/pages?id=X    — soft-archive (status=ARCHIVED)
//
// Pages are addressed publicly at /p/[slug] and rendered via a dedicated
// route (see src/app/p/[slug]/page.tsx). Drafts return 404 to non-admins.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { PageStatus } from '@/generated/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

// ── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as PageStatus | null;
  const id = searchParams.get('id');

  if (id) {
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  }

  const pages = await prisma.page.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ pages });
}

// ── POST ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.slug || !body.titleEn || !body.bodyEn) {
    return NextResponse.json({ message: 'slug, titleEn and bodyEn are required' }, { status: 400 });
  }

  // Slug must be URL-safe.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/.test(body.slug)) {
    return NextResponse.json(
      { message: 'slug must be URL-safe (a-z, 0-9, hyphens, max 82 chars)' },
      { status: 400 }
    );
  }

  try {
    const page = await prisma.page.create({
      data: {
        slug: body.slug,
        titleEn: body.titleEn,
        titleAr: body.titleAr || null,
        bodyEn: body.bodyEn,
        bodyAr: body.bodyAr || null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        ogImageUrl: body.ogImageUrl || null,
        status: (body.status as PageStatus) || PageStatus.DRAFT,
        footerOrder: body.footerOrder ?? 0,
        navOrder: body.navOrder ?? 0,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PAGE_CREATED',
        targetId: page.id,
        details: JSON.stringify({ slug: page.slug, title: page.titleEn }),
      },
    });

    return NextResponse.json({ page });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { message: 'A page with that slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: e?.message || 'Create failed' }, { status: 500 });
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

  // Build the update set explicitly so we can't accidentally let the
  // caller smuggle in fields like createdBy or createdAt.
  const data: Record<string, unknown> = { updatedBy: admin.id };
  for (const key of [
    'titleEn',
    'titleAr',
    'bodyEn',
    'bodyAr',
    'seoTitle',
    'seoDescription',
    'ogImageUrl',
    'status',
    'footerOrder',
    'navOrder',
    'slug',
  ] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  try {
    const page = await prisma.page.update({ where: { id: body.id }, data });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PAGE_UPDATED',
        targetId: page.id,
        details: JSON.stringify({ slug: page.slug, fields: Object.keys(data) }),
      },
    });

    return NextResponse.json({ page });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2025')
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    if (e?.code === 'P2002')
      return NextResponse.json({ message: 'Slug already in use' }, { status: 409 });
    return NextResponse.json({ message: e?.message || 'Update failed' }, { status: 500 });
  }
}

// ── DELETE (soft-archive) ──────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

  try {
    const page = await prisma.page.update({
      where: { id },
      data: { status: PageStatus.ARCHIVED, updatedBy: admin.id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PAGE_ARCHIVED',
        targetId: page.id,
        details: JSON.stringify({ slug: page.slug }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2025')
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    return NextResponse.json({ message: e?.message || 'Archive failed' }, { status: 500 });
  }
}
