import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    take: 10000,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      loyaltyPoints: true,
      createdAt: true,
    },
  });

  const headers = ['id', 'email', 'name', 'role', 'phone', 'loyaltyPoints', 'createdAt'];
  const rows = users.map(u => [
    u.id,
    u.email,
    u.name,
    u.role,
    u.phone ?? '',
    u.loyaltyPoints,
    u.createdAt.toISOString(),
  ]);

  const csv = headers.join(',') + '\n' + rows.map(r => r.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="users-${Date.now()}.csv"`,
    },
  });
}
