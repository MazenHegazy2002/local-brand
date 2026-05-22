import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';

// Track product views — POST /api/track/view
export async function POST(req: Request) {
  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ ok: false }, { status: 400 });

    const session = await getServerSession(authOptions);

    // We store recently viewed in Redis for session tracking (no DB write per view)
    const { redis } = await import('@/lib/redis');

    if (session) {
      const userId = (session.user as SessionUser).id;
      const key = `recent:${userId}`;
      // Store as sorted set with timestamp as score for expiry/ordering
      await redis.zadd(key, Date.now(), productId);
      // Keep only last 20 viewed
      await redis.zremrangebyrank(key, 0, -21);
      // Expire after 30 days
      await redis.expire(key, 60 * 60 * 24 * 30);
    }

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Retrieve recently viewed — GET /api/track/view
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ products: [] });

    const userId = (session.user as SessionUser).id;
    const { redis } = await import('@/lib/redis');

    const key = `recent:${userId}`;
    // Get last 8 viewed product IDs, ordered by most recent
    const productIds = await redis.zrevrange(key, 0, 7);

    if (!productIds.length) return NextResponse.json({ products: [] });

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, published: true, deletedAt: null },
      include: { images: { where: { isPrimary: true } } },
      take: 8,
    });

    // Sort to match Redis ordering (most recently viewed first)
    const sorted = productIds.map(id => products.find(p => p.id === id)).filter(Boolean);

    return NextResponse.json({ products: sorted });
  } catch (_error) {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
