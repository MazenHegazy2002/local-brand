import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, parseInt(searchParams.get('limit') || '200'));

    const logs = await prisma.auditLog.findMany({
      include: {
        admin: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[admin/audit]', err);
    return NextResponse.json({ message: err.message || 'Failed to load audit log' }, { status: 500 });
  }
}
