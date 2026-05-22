import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === 'ADMIN' ? session : null;
}

// PATCH /api/admin/shipping/[id] — update a zone
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, governorates, rateEgp, defaultCourier, estDaysMin, estDaysMax, isActive } = body;

  const zone = await prisma.shippingZone.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(governorates !== undefined && { governorates }),
      ...(rateEgp !== undefined && { rateEgp }),
      ...(defaultCourier !== undefined && { defaultCourier: defaultCourier || null }),
      ...(estDaysMin !== undefined && { estDaysMin: estDaysMin ? Number(estDaysMin) : null }),
      ...(estDaysMax !== undefined && { estDaysMax: estDaysMax ? Number(estDaysMax) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ zone });
}

// DELETE /api/admin/shipping/[id] — remove a zone
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  await prisma.shippingZone.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
