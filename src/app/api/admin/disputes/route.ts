// Admin Disputes inbox API.
import { NextResponse } from 'next/server';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { DisputeStatus } from '@/generated/client';
import { getRequestSession } from '@/lib/mobile-auth';

export async function GET(req: Request) {
  const session = await getRequestSession(req);
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
