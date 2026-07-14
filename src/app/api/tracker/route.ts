import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { redis } from '@/lib/redis';

const geoCache = new Map<string, { city: string; country: string }>();

const countryMap: Record<string, string> = {
  EG: 'Egypt',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
};

async function geolocateIp(
  ip: string,
  headersList: Headers
): Promise<{ city: string; country: string }> {
  try {
    // 1. Try Vercel geolocation headers (present in production Vercel environments)
    const vercelCity = headersList.get('x-vercel-ip-city');
    const vercelCountryCode = headersList.get('x-vercel-ip-country');
    if (vercelCity && vercelCountryCode) {
      const vercelCountry = countryMap[vercelCountryCode.toUpperCase()] || vercelCountryCode;
      return { city: vercelCity, country: vercelCountry };
    }

    // 2. Check in-memory Cache to avoid repeated API lookups
    if (ip && geoCache.has(ip)) {
      return geoCache.get(ip)!;
    }

    // 3. Fallback for Localhost/Private IPs (simulate realistic Egyptian activity)
    if (
      !ip ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.includes('127.0.0.1') ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.')
    ) {
      const localSpots = [
        { city: 'Cairo', country: 'Egypt' },
        { city: 'Damietta', country: 'Egypt' },
        { city: 'Giza', country: 'Egypt' },
        { city: 'Alexandria', country: 'Egypt' },
        { city: 'Asyut', country: 'Egypt' },
      ];
      // Return a stable fallback location based on a hash of the IP for consistency
      const index =
        Math.abs(
          (ip || '127.0.0.1').split('.').reduce((acc, part) => acc + parseInt(part || '0'), 0)
        ) % localSpots.length;
      return localSpots[index];
    }

    // 4. Perform best-effort remote lookup with 2-second timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const spot = { city: data.city || 'Unknown', country: data.country || 'Unknown' };
        geoCache.set(ip, spot);
        return spot;
      }
    }
  } catch {
    // ignore lookup timeouts or aborts
  }

  return { city: 'Cairo', country: 'Egypt' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.sessionToken || !body.path) {
      return NextResponse.json({ error: 'Missing required tracking details' }, { status: 400 });
    }

    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';

    // IP spoofing protection: prioritize Next.js req.ip or Vercel x-real-ip
    const xRealIp = headersList.get('x-real-ip');
    const forwardedFor = headersList.get('x-forwarded-for');
    let ipAddress = (req as any).ip || xRealIp;
    if (!ipAddress && forwardedFor) {
      ipAddress = forwardedFor.split(',')[0].trim();
    }
    if (!ipAddress) {
      ipAddress = '127.0.0.1';
    }

    // Rate Limiting by IP (60 requests per minute)
    const rateLimitKey = `rate_limit:tracker:${ipAddress}`;
    try {
      const currentRequests = await redis.incr(rateLimitKey);
      if (currentRequests === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      if (currentRequests > 60) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch (redisErr) {
      // Fail open if Redis is down
      console.error('[tracker] Redis rate limit check failed:', redisErr);
    }

    let location = { city: 'Cairo', country: 'Egypt' };
    try {
      const loc = await geolocateIp(ipAddress, headersList);
      if (loc && loc.city && loc.country) {
        location = loc;
      }
    } catch (e) {
      console.error('[geolocateIp] Failed, using fallback:', e);
    }

    // Derive userId from the server-side session instead of trusting the client body.userId
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        userId = (session.user as SessionUser).id;
      }
    } catch (sessionErr) {
      console.error('[tracker] Failed to fetch server-side session:', sessionErr);
    }

    const log = await prisma.trafficLog.create({
      data: {
        sessionToken: body.sessionToken,
        path: body.path,
        eventType: body.eventType || 'PAGE_VIEW',
        eventDetails: body.eventDetails || null,
        referrer: body.referrer,
        userAgent,
        ipAddress,
        city: location.city,
        country: location.country,
        loadTimeMs: body.loadTimeMs ? parseInt(body.loadTimeMs) : null,
        userId,
      },
    });

    return NextResponse.json({ id: log.id }, { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[tracker] Logging failed:', error);
    return NextResponse.json({ error: 'Tracking system error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id || !body.sessionToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const logId = body.id;
    const sessionToken = body.sessionToken;
    const durationSec = parseInt(body.durationSec) || 0;

    // Verify sessionToken matches the DB record
    const log = await prisma.trafficLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json({ error: 'Traffic log not found' }, { status: 404 });
    }

    if (log.sessionToken !== sessionToken) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.trafficLog.update({
      where: { id: logId },
      data: { durationSec },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[tracker] Heartbeat update failed:', error);
    return NextResponse.json({ error: 'Tracking system error' }, { status: 500 });
  }
}
