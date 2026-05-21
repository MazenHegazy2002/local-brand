import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';

// Web push subscription registry. Stored as a Redis hash keyed by user, with
// each device's `endpoint` as the field — that way users with multiple
// devices keep notifications working on all of them. The previous version
// wrote a single `push:<userId>` string which clobbered the previous device
// every time a user resubscribed (e.g. on a phone after enabling on desktop).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}));
  const subscription = body?.subscription;
  const endpoint: string | undefined = subscription?.endpoint;

  if (!subscription || !endpoint) {
    return NextResponse.json({ message: 'subscription with endpoint required' }, { status: 400 });
  }

  try {
    await redis.hset(`push:${userId}`, endpoint, JSON.stringify(subscription));
    // 90-day expiry — browsers regularly rotate endpoints, no point keeping
    // dead ones forever.
    await redis.expire(`push:${userId}`, 60 * 60 * 24 * 90);
  } catch (err) {
    console.error('[push/subscribe] redis error:', err);
    // Treat as non-fatal — the user can re-subscribe later.
  }

  return NextResponse.json({ success: true });
}
