// Admin Reviews + Q&A moderation API.
//
// GET   /api/admin/reviews?status=PENDING — list reviews with filters
// PATCH /api/admin/reviews                — body: { id, type:'review'|'qa', status, moderationNote? }
//
// The same endpoint handles both Reviews and ProductQA via `?type=qa`,
// keeping the moderator UI stupid simple.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { ReviewStatus, QAStatus } from '@/generated/client';

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
  const type = searchParams.get('type') || 'review';
  const status = searchParams.get('status') as ReviewStatus | QAStatus | null;
  const search = (searchParams.get('search') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = 25;

  if (type === 'qa') {
    const where = {
      ...(status ? { status: status as QAStatus } : {}),
      ...(search
        ? {
            OR: [
              { question: { contains: search, mode: 'insensitive' as const } },
              { answer: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total, counts] = await Promise.all([
      prisma.productQA.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productQA.count({ where }),
      prisma.productQA.groupBy({ by: ['status'], _count: true }),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      counts: Object.fromEntries(counts.map(c => [c.status, c._count])),
    });
  }

  const where = {
    ...(status ? { status: status as ReviewStatus } : {}),
    ...(search ? { comment: { contains: search, mode: 'insensitive' as const } } : {}),
  };
  const [items, total, counts] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ['status'], _count: true }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    counts: Object.fromEntries(counts.map(c => [c.status, c._count])),
  });
}

// ── PATCH ──────────────────────────────────────────────────────────────────
interface PatchBody {
  id?: string;
  type?: 'review' | 'qa';
  status?: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  moderationNote?: string;
  flaggedReason?: string;
}
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  if (!body.id || !body.status) {
    return NextResponse.json({ message: 'id and status required' }, { status: 400 });
  }

  const isFlagging = body.status === 'HIDDEN' || body.status === 'REJECTED';
  const data = {
    status: body.status,
    moderationNote: body.moderationNote ?? null,
    flaggedReason: isFlagging ? (body.flaggedReason ?? null) : null,
    flaggedAt: isFlagging ? new Date() : null,
    flaggedBy: isFlagging ? admin.id : null,
  };

  if (body.type === 'qa') {
    const updated = await prisma.productQA.update({
      where: { id: body.id },
      data: data as {
        status: QAStatus;
        moderationNote: string | null;
        flaggedReason: string | null;
        flaggedAt: Date | null;
        flaggedBy: string | null;
      },
    });
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: `QA_${body.status}`,
        targetId: body.id,
        details: JSON.stringify({ status: body.status, note: body.moderationNote }),
      },
    });
    return NextResponse.json({ ok: true, item: updated });
  }

  const updated = await prisma.review.update({
    where: { id: body.id },
    data: data as {
      status: ReviewStatus;
      moderationNote: string | null;
      flaggedReason: string | null;
      flaggedAt: Date | null;
      flaggedBy: string | null;
    },
  });
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: `REVIEW_${body.status}`,
      targetId: body.id,
      details: JSON.stringify({ status: body.status, note: body.moderationNote }),
    },
  });
  return NextResponse.json({ ok: true, item: updated });
}
