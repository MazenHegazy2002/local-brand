// GET /api/admin/webhooks/[id] — full payload for a single webhook log row
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const log = await prisma.webhookLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  return NextResponse.json(log);
}
