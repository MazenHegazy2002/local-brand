import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

// Human-readable mapping for visitor events based on path and eventType
function formatEventAction(eventType: string, path: string, eventDetails?: string | null): string {
  if (eventType === 'ADD_TO_CART') return 'Add To Cart';
  if (eventType === 'CHECKOUT_STARTED') return 'Checkout Started';
  if (eventType === 'PURCHASE') return 'Purchase Completed';

  if (path === '/') return 'View Home Page';
  if (path === '/shop') return 'View Shop';
  if (path === '/cart') return 'View Cart';
  if (path === '/checkout') return 'Checkout Started';
  if (path.startsWith('/product/')) {
    const slug = path.split('/product/')[1]?.replace(/-/g, ' ');
    return `View Product: ${slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Details'}`;
  }
  if (path.startsWith('/p/')) {
    const slug = path.split('/p/')[1]?.replace(/-/g, ' ');
    return `View Page: ${slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Policy'}`;
  }
  if (path.startsWith('/dashboard')) return 'View User Dashboard';
  if (path.startsWith('/seller-hub')) return 'View Seller Hub';
  if (path.startsWith('/admin-os')) return 'View Admin Panel';

  // Fallback
  return `Visit ${path}`;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rangeDays = parseInt(searchParams.get('days') || '7') || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);

    // 1. Fetch raw logs in date range
    const logs = await prisma.trafficLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' }, // Order ASC so timeline parses chronologically
    });

    const totalViews = logs.length;
    const uniqueSessionsCount = new Set(logs.map(l => l.sessionToken)).size;

    // 2. Average speeds & durations
    const loadTimes = logs.map(l => l.loadTimeMs).filter((t): t is number => t !== null && t > 0);
    const avgLoadTime =
      loadTimes.length > 0
        ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
        : 0;
    const durations = logs.map(l => l.durationSec);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // 3. Top landing pages
    const pathCounts: Record<string, number> = {};
    logs.forEach(l => {
      pathCounts[l.path] = (pathCounts[l.path] || 0) + 1;
    });
    const topPaths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Top Referrers
    const referrerCounts: Record<string, number> = {};
    logs.forEach(l => {
      const ref = l.referrer ? new URL(l.referrer).hostname : 'Direct / Bookmark';
      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    });
    const topReferrers = Object.entries(referrerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Group logs into distinct Visitor Sessions
    const sessionsMap = new Map<
      string,
      {
        sessionToken: string;
        city: string;
        country: string;
        ipAddress: string | null;
        updatedAt: Date;
        createdAt: Date;
        events: { action: string; path: string; timestamp: Date }[];
      }
    >();

    // Iterate through logs chronologically (asc) to build event stream
    logs.forEach(l => {
      const key = l.sessionToken;
      const city = l.city || 'Cairo';
      const country = l.country || 'Egypt';
      const action = formatEventAction(l.eventType, l.path, l.eventDetails);

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          sessionToken: key,
          city,
          country,
          ipAddress: l.ipAddress,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
          events: [],
        });
      }

      const sessionObj = sessionsMap.get(key)!;
      sessionObj.updatedAt = l.updatedAt;
      sessionObj.events.push({
        action,
        path: l.path,
        timestamp: l.createdAt,
      });
    });

    const sessions = Array.from(sessionsMap.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    // 6. Calculate Top Geolocation Leaderboard (Sessions by Location)
    const locationCounts: Record<string, number> = {};
    sessions.forEach(s => {
      const locationKey = `${s.city}, ${s.country}`;
      locationCounts[locationKey] = (locationCounts[locationKey] || 0) + 1;
    });
    const sessionsByLocation = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    // 7. Calculate online users (active in the last 2 minutes)
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const activeUsersCount = sessions.filter(s => s.updatedAt >= activeCutoff).length;

    return NextResponse.json(
      {
        totalViews,
        uniqueSessions: uniqueSessionsCount,
        avgLoadTime,
        avgDuration,
        topPaths,
        topReferrers,
        activeUsersCount,
        sessionsByLocation,
        sessions, // full grouped visitor session lists
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[tracker-admin] Analytics aggregation failed:', error);
    return NextResponse.json({ error: 'Tracker aggregation error' }, { status: 500 });
  }
}
