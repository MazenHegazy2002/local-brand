import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * User activity event tracking
 * POST /api/events — track search, view, add-to-cart, purchase events
 * GET /api/events — fetch user's event history for analytics
 */
export async function POST(req: Request) {
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');
    const session = await getServerSession(authOptions);

    const { eventType, productId, searchQuery, metadata } = await req.json();

    if (!eventType) return NextResponse.json({ ok: false }, { status: 400 });

    const userId = session ? (session.user as any).id : null;

    // Store events in Redis for hot-path tracking (no DB write per event)
    const { redis } = await import('@/lib/redis');

    const event = {
      userId,
      eventType,           // 'view' | 'search' | 'add_to_cart' | 'purchase' | 'wishlist'
      productId: productId || null,
      searchQuery: searchQuery || null,
      metadata: metadata || null,
      timestamp: Date.now(),
    };

    // Push to Redis list (ring buffer of last 1000 events)
    const key = userId ? `events:user:${userId}` : `events:anon:${Date.now()}`;
    await redis.lpush(key, JSON.stringify(event));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, 60 * 60 * 24 * 7); // 7 day TTL

    // Increment product view counter in Redis
    if (eventType === 'view' && productId) {
      await redis.incr(`views:product:${productId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ events: [] });

    const userId = (session.user as any).id;
    const { redis } = await import('@/lib/redis');

    const raw = await redis.lrange(`events:user:${userId}`, 0, 49);
    const events = raw.map(e => JSON.parse(e));

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
