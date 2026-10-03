import { redis } from '@/lib/redis';

// ponytail: counts storefront page loads (incl. refreshes/bots), not unique visitors.
// Add a per-visitor HyperLogLog (PFADD) if sellers need uniques.

const TTL_SECONDS = 40 * 24 * 60 * 60;

/** YYYY-MM-DD in Africa/Cairo (en-CA formats as ISO date). */
export const cairoDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

const key = (sellerId: string, day: string) => `visits:store:${sellerId}:${day}`;

/** Fire-and-forget: never throws, never awaited by the page. */
export function recordStoreVisit(sellerId: string | null | undefined): void {
  if (!sellerId || !redis) return;
  const k = key(sellerId, cairoDay(new Date()));
  void redis
    .incr(k)
    .then(n => (n === 1 ? redis.expire(k, TTL_SECONDS) : 0))
    .catch(() => {});
}

export async function getStoreVisits(sellerId: string, days: string[]): Promise<number> {
  if (!redis) return 0;
  try {
    const vals = await Promise.all(days.map(d => redis.get(key(sellerId, d))));
    return vals.reduce((s, v) => s + (Number(v) || 0), 0);
  } catch {
    return 0;
  }
}
