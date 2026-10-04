// Expo push to users' phones (shows in the notification bar when the app is closed).
// Tokens are registered by the app via /api/notifications/push-token.
import { redis } from './redis';

// Web links → in-app routes the mobile tap handler can open.
export function appRoute(link?: string | null): string {
  const order = link?.match(/^\/dashboard\/orders\/([^/?#]+)/);
  if (order) return `/order/${order[1]}`;
  return '/notifications';
}

export async function pushToUsers(
  userIds: string[],
  title: string,
  body: string,
  link?: string | null
): Promise<void> {
  try {
    const keys = userIds.map(id => `push:token:${id}`);
    const tokens = [...new Set((await Promise.all(keys.map(k => redis.get(k)))).filter(Boolean))];
    const url = appRoute(link);
    for (let i = 0; i < tokens.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          tokens.slice(i, i + 100).map(to => ({ to, title, body, sound: 'default', data: { url } }))
        ),
        signal: AbortSignal.timeout(15_000),
      });
    }
  } catch {
    // best-effort: the in-app notification is already saved
  }
}
