// Admin Email Templates API.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const items = await prisma.emailTemplate.findMany({ orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ items });
}

interface PostBody {
  key?: string;
  subjectEn?: string;
  subjectAr?: string;
  bodyEn?: string;
  bodyAr?: string;
  variables?: string[];
  isActive?: boolean;
}
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PostBody;
  if (!body.key || !body.subjectEn || !body.bodyEn) {
    return NextResponse.json({ message: 'key, subjectEn, bodyEn required' }, { status: 400 });
  }
  try {
    const created = await prisma.emailTemplate.create({
      data: {
        key: body.key,
        subjectEn: body.subjectEn,
        subjectAr: body.subjectAr ?? null,
        bodyEn: body.bodyEn,
        bodyAr: body.bodyAr ?? null,
        variables: body.variables ? JSON.stringify(body.variables) : null,
        isActive: body.isActive ?? true,
        updatedBy: admin.id,
      },
    });
    return NextResponse.json({ template: created });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2002')
      return NextResponse.json({ message: 'Template key already exists' }, { status: 409 });
    return NextResponse.json({ message: e?.message || 'Create failed' }, { status: 500 });
  }
}

interface PatchBody {
  id?: string;
  subjectEn?: string;
  subjectAr?: string;
  bodyEn?: string;
  bodyAr?: string;
  isActive?: boolean;
}
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  if (!body.id) return NextResponse.json({ message: 'id required' }, { status: 400 });

  const data: Record<string, unknown> = { updatedBy: admin.id };
  for (const k of ['subjectEn', 'subjectAr', 'bodyEn', 'bodyAr', 'isActive'] as const) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  const updated = await prisma.emailTemplate.update({ where: { id: body.id }, data });
  return NextResponse.json({ template: updated });
}
