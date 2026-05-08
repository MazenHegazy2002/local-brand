import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public: returns the currently active homepage banners, respecting start/end dates.
export async function GET() {
  try {
    const now = new Date();
    const banners = await prisma.homepageBanner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        linkUrl: true,
        ctaLabel: true,
      },
    });

    return NextResponse.json({ banners }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || 'Failed to load banners' }, { status: 500 });
  }
}
