import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === 'ADMIN' ? session : null;
}

const updateZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // governorates is stored as a JSON string in the DB; accept an array and serialise below
  governorates: z.array(z.string()).min(1).optional(),
  rateEgp: z.number().nonnegative().optional(),
  defaultCourier: z.string().max(100).nullish(),
  estDaysMin: z.number().int().positive().nullish(),
  estDaysMax: z.number().int().positive().nullish(),
  isActive: z.boolean().optional(),
});

// PATCH /api/admin/shipping/[id] — update a zone
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, governorates, rateEgp, defaultCourier, estDaysMin, estDaysMax, isActive } =
    parsed.data;

  const zone = await prisma.shippingZone.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(governorates !== undefined && { governorates: JSON.stringify(governorates) }),
      ...(rateEgp !== undefined && { rateEgp }),
      ...(defaultCourier !== undefined && { defaultCourier: defaultCourier ?? null }),
      ...(estDaysMin !== undefined && { estDaysMin: estDaysMin ?? null }),
      ...(estDaysMax !== undefined && { estDaysMax: estDaysMax ?? null }),
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
