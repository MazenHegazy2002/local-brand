// Admin cache-invalidation endpoint.
//
// POST /api/admin/cache/clear  body { pattern: 'product:*' }
//
// Wraps Redis SCAN + DEL so we can wipe arbitrary key patterns without
// shelling into a Redis console. Patterns must follow Redis glob syntax
// (`*` and `?` only).
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

interface PostBody {
  pattern?: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const pattern = (body.pattern || '').trim();
  if (!pattern) return NextResponse.json({ message: 'pattern required' }, { status: 400 });

  // Refuse the literal `*` from shells unless it's wrapped — protect against
  // an admin pasting `*` and wiping the entire Redis instance for the host.
  // The check is loose: we just want a deliberate decision.
  if (pattern === '*' && !req.headers.get('x-confirm-wipe')) {
    return NextResponse.json(
      { message: 'Confirm with x-confirm-wipe header to wipe all keys' },
      { status: 400 }
    );
  }

  try {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next as string;
      const matched = keys as string[];
      if (matched.length) {
        deleted += matched.length;
        await redis.del(...matched);
      }
    } while (cursor !== '0');

    // Guard against AuditLog_adminId_fkey FK violations: a stale JWT can carry
    // an id that no longer exists in the User table (soft/hard-deleted account).
    const adminId = (session.user as SessionUser).id;
    const adminExists = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true },
    });
    if (adminExists) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'CACHE_CLEARED',
          targetId: null,
          details: JSON.stringify({ pattern, deleted }),
        },
      });
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
