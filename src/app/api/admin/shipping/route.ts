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

const createZoneSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  // governorates is stored as a JSON string in the DB; accept an array and serialise below
  governorates: z.array(z.string()).min(1, 'at least one governorate is required'),
  rateEgp: z.number({ required_error: 'rateEgp is required' }).nonnegative(),
  defaultCourier: z.string().max(100).nullish(),
  estDaysMin: z.number().int().positive().nullish(),
  estDaysMax: z.number().int().positive().nullish(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/shipping — list all shipping zones
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const zones = await prisma.shippingZone.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ zones });
}

// POST /api/admin/shipping — create a zone
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const parsed = createZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, governorates, rateEgp, defaultCourier, estDaysMin, estDaysMax, isActive } =
    parsed.data;

  const zone = await prisma.shippingZone.create({
    data: {
      name,
      governorates: JSON.stringify(governorates),
      rateEgp,
      defaultCourier: defaultCourier ?? null,
      estDaysMin: estDaysMin ?? null,
      estDaysMax: estDaysMax ?? null,
      isActive: isActive !== false,
    },
  });

  return NextResponse.json({ zone }, { status: 201 });
}
