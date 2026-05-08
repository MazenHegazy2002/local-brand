import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  linkUrl: z.string().min(1).optional(),
  ctaLabel: z.string().max(50).optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid banner', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startsAt, endsAt, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) data.endsAt = endsAt ? new Date(endsAt) : null;

    const banner = await prisma.homepageBanner.update({ where: { id }, data });
    return NextResponse.json({ banner });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.homepageBanner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || 'Failed to delete banner' }, { status: 500 });
  }
}
