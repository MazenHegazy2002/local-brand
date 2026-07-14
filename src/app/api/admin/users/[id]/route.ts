import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { z } from 'zod';

/**
 * PATCH /api/admin/users/[id]
 *
 * Admin-only endpoint to manage user accounts.
 * Supported actions:
 *   suspend    - soft-delete (sets deletedAt)
 *   reactivate - clears deletedAt
 *   ban        - soft-delete + BAN audit note
 *   changeRole - updates User.role
 *
 * All mutations are logged to AuditLog.
 */

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend') }),
  z.object({ action: z.literal('reactivate') }),
  z.object({ action: z.literal('ban'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('changeRole'), role: z.enum(['BUYER', 'SELLER', 'ADMIN']) }),
]);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as SessionUser;
  if (user.role !== 'ADMIN') return null;
  return user;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  const { id } = await params;
  if (id === admin.id)
    return NextResponse.json({ message: 'Cannot modify your own account' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    );
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, deletedAt: true },
  });
  if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 });
  const { action } = parsed.data;
  const makeAudit = (a: string, extra?: Record<string, unknown>) =>
    prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: a,
        targetId: id,
        details: JSON.stringify({ email: target.email, ...extra }),
      },
    });
  if (action === 'ban') {
    const reason = parsed.data.reason ?? 'Banned by admin';
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
      makeAudit('BAN_USER', { reason }),
    ]);
    return NextResponse.json({ success: true });
  }
  if (action === 'suspend') {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
      makeAudit('SUSPEND_USER'),
    ]);
    return NextResponse.json({ success: true });
  }
  if (action === 'reactivate') {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { deletedAt: null } }),
      makeAudit('REACTIVATE_USER'),
    ]);
    return NextResponse.json({ success: true });
  }
  if (action === 'changeRole') {
    const role = parsed.data.role;
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { role } }),
      makeAudit('CHANGE_USER_ROLE', { previousRole: target.role, newRole: role }),
    ]);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
}
