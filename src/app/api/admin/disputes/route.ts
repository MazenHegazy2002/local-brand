// Admin Disputes inbox API.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { DisputeStatus } from '@/generated/client';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as DisputeStatus | null;
  const items = await prisma.dispute.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ items });
}
