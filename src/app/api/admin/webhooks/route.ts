// GET  /api/admin/webhooks  — recent webhook delivery log (last 200 rows)
// POST /api/admin/webhooks/retry  — re-process a failed webhook row
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

  const logs = await prisma.webhookLog.findMany({
    where: {
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      source: true,
      event: true,
      status: true,
      statusCode: true,
      errorMsg: true,
      receivedAt: true,
      processedAt: true,
      // Exclude payload by default (can be large) — detail view fetches it
    },
  });

  // Aggregate stats for the header bar
  const [total, errors, last24h] = await Promise.all([
    prisma.webhookLog.count(),
    prisma.webhookLog.count({ where: { status: 'error' } }),
    prisma.webhookLog.count({
      where: { receivedAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
  ]);

  return NextResponse.json({ logs, stats: { total, errors, last24h } });
}
