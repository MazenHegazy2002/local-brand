import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';

// Drop a single device's subscription from the user's push hash. Mirrors
// the per-endpoint write in /api/pwa/web-push/subscribe. If the caller
// doesn't pass an endpoint we fall back to wiping the entire hash so legacy
// clients stay functional.
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => ({}) as { endpoint?: string });
  const endpoint: string | undefined = body?.endpoint;

  try {
    if (endpoint) {
      await redis.hdel(`push:${userId}`, endpoint);
    } else {
      await redis.del(`push:${userId}`);
    }
  } catch (err) {
    console.error('[push/unsubscribe] redis error:', err);
  }

  return NextResponse.json({ success: true });
}
