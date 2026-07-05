// Admin Dispute mutation API — PATCH to update status / resolution.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { DisputeStatus } from '@/generated/client';

interface PatchBody {
  status?: DisputeStatus;
  resolution?: string;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  if (!body.status) return NextResponse.json({ message: 'status required' }, { status: 400 });

  const updated = await prisma.dispute.update({
    where: { id },
    data: {
      status: body.status,
      resolution: body.resolution ?? undefined,
      resolvedAt: ['RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED'].includes(body.status)
        ? new Date()
        : null,
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
        action: `DISPUTE_${body.status}`,
        targetId: id,
        details: JSON.stringify({ resolution: body.resolution }),
      },
    });
  }

  return NextResponse.json({ dispute: updated });
}
