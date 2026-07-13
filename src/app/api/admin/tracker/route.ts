import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

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
      orderBy: { createdAt: 'desc' },
    });

    const totalViews = logs.length;
    const uniqueSessions = new Set(logs.map(l => l.sessionToken)).size;

    // 2. Calculate average load times and time spent
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

    // 3. Top landing pages / paths
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

    // 5. Active sessions right now (active in the last 2 minutes)
    const activeCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const activeLogs = await prisma.trafficLog.findMany({
      where: {
        updatedAt: { gte: activeCutoff },
      },
      select: {
        sessionToken: true,
        path: true,
        referrer: true,
        userAgent: true,
        updatedAt: true,
      },
    });

    const activeSessionsMap = new Map<string, (typeof activeLogs)[0]>();
    activeLogs.forEach(l => {
      // Keep the most recent entry per session token
      const existing = activeSessionsMap.get(l.sessionToken);
      if (!existing || l.updatedAt > existing.updatedAt) {
        activeSessionsMap.set(l.sessionToken, l);
      }
    });
    const activeUsersCount = activeSessionsMap.size;
    const activeUsers = Array.from(activeSessionsMap.values());

    // 6. Recent visit logs timeline (limit to last 50)
    const recentVisits = logs.slice(0, 50).map(l => ({
      id: l.id,
      path: l.path,
      referrer: l.referrer ? new URL(l.referrer).hostname : 'Direct',
      userAgent: l.userAgent,
      ipAddress: l.ipAddress,
      loadTimeMs: l.loadTimeMs,
      durationSec: l.durationSec,
      createdAt: l.createdAt,
    }));

    return NextResponse.json(
      {
        totalViews,
        uniqueSessions,
        avgLoadTime,
        avgDuration,
        topPaths,
        topReferrers,
        activeUsersCount,
        activeUsers,
        recentVisits,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[tracker-admin] Analytics aggregation failed:', error);
    return NextResponse.json({ error: 'Tracker aggregation error' }, { status: 500 });
  }
}
