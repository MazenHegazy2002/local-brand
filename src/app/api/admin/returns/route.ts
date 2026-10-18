// Admin Returns/RMA inbox API.
import { NextResponse } from 'next/server';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { ReturnStatus } from '@/generated/client';
import { getRequestSession } from '@/lib/mobile-auth';

export async function GET(req: Request) {
  const session = await getRequestSession(req);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as ReturnStatus | null;
  const items = await prisma.returnRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ items });
}
