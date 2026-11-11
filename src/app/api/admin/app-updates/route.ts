// GET  /api/admin/app-updates — published over-the-air app updates.
// POST /api/admin/app-updates { id, active } — turn one on/off (admins only).
// Turning off the live update sends phones back to the previous active one,
// or to the version built into the store app if none is left.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  const me = await getRequestUser(req);
  if (me?.role !== 'ADMIN' && me?.role !== 'CO_ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const updates = await prisma.appUpdate.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
  return NextResponse.json({ updates, canManage: me.role === 'ADMIN' });
}

export async function POST(req: NextRequest) {
  const me = await getRequestUser(req);
  if (me?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.id !== 'string' || typeof body?.active !== 'boolean')
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const u = await prisma.appUpdate.update({
    where: { id: body.id },
    data: { active: body.active },
  });
  await prisma.auditLog
    .create({
      data: {
        adminId: me.id,
        action: body.active ? 'APP_UPDATE_ENABLED' : 'APP_UPDATE_DISABLED',
        targetId: u.id,
      },
    })
    .catch(() => {});
  return NextResponse.json({ ok: true, update: u });
}
