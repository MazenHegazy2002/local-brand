import { NextResponse } from 'next/server';
import { getCachedBanners } from '@/lib/cache';

// Public: returns the currently active homepage banners, respecting start/end dates.
export async function GET() {
  try {
    const banners = await getCachedBanners();

    return NextResponse.json(
      { banners },
      {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || 'Failed to load banners' }, { status: 500 });
  }
}
