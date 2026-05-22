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
  const { name, governorates, rateEgp, defaultCourier, estDaysMin, estDaysMax, isActive } = body;

  if (!name || !governorates || rateEgp == null) {
    return NextResponse.json(
      { error: 'name, governorates and rateEgp are required' },
      { status: 400 }
    );
  }

  const zone = await prisma.shippingZone.create({
    data: {
      name,
      governorates,
      rateEgp,
      defaultCourier: defaultCourier || null,
      estDaysMin: estDaysMin ? Number(estDaysMin) : null,
      estDaysMax: estDaysMax ? Number(estDaysMax) : null,
      isActive: isActive !== false,
    },
  });

  return NextResponse.json({ zone }, { status: 201 });
}
