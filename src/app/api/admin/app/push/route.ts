// POST /api/admin/app/push — send an Expo push notification to one user
// (by email) or to every user with a registered token (email omitted).
// Body: { title, body, url?, email? } → { sent, failed, noTokens }
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getRequestUser } from '@/lib/mobile-auth';

const Body = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(500),
  url: z.string().trim().startsWith('/').max(300).optional(), // in-app route, e.g. /product/abc
  email: z.string().trim().toLowerCase().email().optional(),
});

type Ticket = { status?: 'ok' | 'error'; details?: { error?: string } };

export async function POST(req: NextRequest) {
  const admin = await getRequestUser(req);
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { title, body, url, email } = parsed.data;

  let target = 'all';
  let keys: string[];
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    target = user.id;
    keys = [`push:token:${user.id}`];
  } else {
    // ponytail: KEYS + one GET per key scans the keyspace; fine for rare admin
    // broadcasts. Add sadd/smembers (+ mget) to FallbackRedis if users grow large.
    keys = await redis.keys('push:token:*');
  }

  // token -> redis key; also dedupes a device shared by two accounts.
  const values = await Promise.all(keys.map(k => redis.get(k)));
  const byToken = new Map<string, string>();
  values.forEach((t, i) => t && byToken.set(t, keys[i]));
  const tokens = [...byToken.keys()];

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    let tickets: Ticket[] = [];
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          chunk.map(to => ({ to, title, body, sound: 'default', data: { url } }))
        ),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) tickets = (await res.json()).data ?? [];
    } catch {
      // network / timeout — whole chunk counts as failed below
    }
    chunk.forEach((token, j) => {
      if (tickets[j]?.status === 'ok') return void sent++;
      failed++;
      if (tickets[j]?.details?.error === 'DeviceNotRegistered') dead.push(byToken.get(token)!);
    });
  }
  if (dead.length) await redis.del(...dead);

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: 'SEND_PUSH',
      targetId: target,
      details: JSON.stringify({ title, url: url ?? null, sent, failed, removed: dead.length }),
    },
  });

  return NextResponse.json({ sent, failed, noTokens: tokens.length === 0 });
}
