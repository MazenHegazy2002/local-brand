// GET  /api/admin/jobs  — recent job log (last 200 rows)
// POST /api/admin/jobs  — create a manual job entry (for testing)
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
  const status = searchParams.get('status') || undefined;
  const name = searchParams.get('name') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

  const jobs = await prisma.jobLog.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Stats for header
  const [total, failed, running, pending] = await Promise.all([
    prisma.jobLog.count(),
    prisma.jobLog.count({ where: { status: 'failed' } }),
    prisma.jobLog.count({ where: { status: 'running' } }),
    prisma.jobLog.count({ where: { status: 'pending' } }),
  ]);

  return NextResponse.json({
    jobs,
    stats: { total, failed, running, pending },
  });
}
