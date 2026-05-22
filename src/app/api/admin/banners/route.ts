import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const bannerSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional(),
  imageUrl: z.string().url(),
  linkUrl: z.string().min(1),
  ctaLabel: z.string().max(50).optional(),
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ((session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const banners = await prisma.homepageBanner.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ banners });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || 'Failed to load banners' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if ((session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid banner', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { startsAt, endsAt, ...rest } = parsed.data;
    const banner = await prisma.homepageBanner.create({
      data: {
        ...rest,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || 'Failed to create banner' },
      { status: 500 }
    );
  }
}
