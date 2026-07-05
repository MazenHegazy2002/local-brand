// Admin Return mutation API — PATCH approve/reject/complete.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { ReturnStatus } from '@/generated/client';

interface PatchBody {
  status?: ReturnStatus;
  adminNotes?: string;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  if (!body.status) return NextResponse.json({ message: 'status required' }, { status: 400 });

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: {
      status: body.status,
      adminNotes: body.adminNotes ?? undefined,
    },
  });

  // Guard against AuditLog_adminId_fkey FK violations: a stale JWT can carry
  // an id that no longer exists in the User table (soft/hard-deleted account).
  const adminId = (session.user as SessionUser).id;
  const adminExists = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true },
  });
  if (adminExists) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: `RMA_${body.status}`,
        targetId: id,
        details: JSON.stringify({ notes: body.adminNotes }),
      },
    });
  }

  return NextResponse.json({ rma: updated });
}
