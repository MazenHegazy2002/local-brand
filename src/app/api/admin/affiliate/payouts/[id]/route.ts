// src/app/api/admin/affiliate/payouts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return null;
  return session;
}

const UpdatePayoutSchema = z.object({
  status: z.enum(['PROCESSING', 'PAID', 'REJECTED']),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdatePayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, adminNote } = parsed.data;

  const payout = await prisma.affiliatePayout.findUnique({
    where: { id },
    include: { commissions: true },
  });

  if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 });

  // Update payout status
  const updated = await prisma.affiliatePayout.update({
    where: { id },
    data: {
      status,
      adminNote,
      processedBy: session.user.id,
      processedAt: new Date(),
    },
  });

  // Mark commissions as PAID when payout is marked PAID
  if (status === 'PAID') {
    await prisma.commission.updateMany({
      where: { payoutId: id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  return NextResponse.json({ success: true, payout: updated });
}
