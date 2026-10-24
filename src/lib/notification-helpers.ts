import { prisma } from './prisma';
import { publishNotification } from './sse';

interface NotifyOptions {
  userId: string;
  title: string;
  message: string;
  link?: string;
  save?: boolean;
}

export async function notifyUser(options: NotifyOptions): Promise<void> {
  const { userId, title, message, link, save = true } = options;

  if (save) {
    try {
      await prisma.notification.create({
        data: { userId, title, message, link },
      });
    } catch {}
  }

  try {
    await publishNotification(userId, {
      title,
      message,
      link,
      createdAt: new Date().toISOString(),
    });
  } catch {}
}

export async function notifyMultiple(
  userIds: string[],
  notification: Omit<NotifyOptions, 'userId'>
): Promise<void> {
  await Promise.all(userIds.map(userId => notifyUser({ ...notification, userId })));
}

export async function notifyAllSellers(
  title: string,
  message: string,
  link?: string
): Promise<void> {
  const sellers = await prisma.user.findMany({
    where: { role: 'SELLER', deletedAt: null },
    select: { id: true },
  });
  await Promise.all(sellers.map(s => notifyUser({ userId: s.id, title, message, link })));
}

export async function notifyAllBuyers(
  title: string,
  message: string,
  link?: string
): Promise<void> {
  const buyers = await prisma.user.findMany({
    where: { role: 'BUYER', deletedAt: null },
    select: { id: true },
    take: 1000,
  });
  await Promise.all(buyers.map(b => notifyUser({ userId: b.id, title, message, link })));
}
// Expo push to the user's phone (token saved by /api/notifications/push-token). `url` is an
// in-app route the app opens on tap, e.g. /order/<id>. Never throws.
export async function pushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  try {
    const { redis } = await import('./redis');
    const key = `push:token:${userId}`;
    const to = await redis?.get(key);
    if (!to) return;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to, title, body, sound: 'default', data: { url } }),
      signal: AbortSignal.timeout(10_000),
    });
    const ticket = res.ok ? (await res.json()).data : null;
    if (ticket?.details?.error === 'DeviceNotRegistered') await redis?.del(key);
  } catch (err) {
    console.error('[push] send failed:', err);
  }
}
