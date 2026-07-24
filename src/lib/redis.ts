import Redis from 'ioredis';
import { prisma } from './prisma';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl && process.env.NODE_ENV === 'production') {
  console.warn('[redis] REDIS_URL is not set in production — using database fallback');
}

const rawRedis = new Redis(redisUrl || 'redis://localhost:6379', {
  // Avoid connection attempts during module import / boot.
  lazyConnect: true,
  maxRetriesPerRequest: 0, // Fail fast so fallback kicks in immediately!
  connectTimeout: 2_000,
  enableOfflineQueue: false,
});

// Prevent noisy unhandled error events from crashing or polluting logs.
let lastRedisErrorTime = 0;
let lastRedisErrorMessage = '';

rawRedis.on('error', error => {
  const msg = (error instanceof Error ? error.message : String(error)).trim();
  if (!msg) return; // Suppress empty errors completely!

  const now = Date.now();
  // Suppress duplicate warnings if they occur within 10 seconds of each other
  if (msg === lastRedisErrorMessage && now - lastRedisErrorTime < 10000) {
    return;
  }

  lastRedisErrorMessage = msg;
  lastRedisErrorTime = now;
  console.warn(`[redis-raw] ${msg}`);
});

class FallbackRedis {
  private async runWithFallback<T>(
    runRaw: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      // If client status indicates it's in a failed/end state, fail immediately
      if (rawRedis.status === 'end') {
        throw new Error('Redis connection is ended');
      }
      return await runRaw();
    } catch (_err) {
      // Silently fall back to DB to keep pages robust and speedy
      return await fallback();
    }
  }

  async ping(): Promise<string> {
    try {
      return await rawRedis.ping();
    } catch {
      return 'PONG';
    }
  }

  async get(key: string): Promise<string | null> {
    return this.runWithFallback(
      () => rawRedis.get(key),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry) return null;
        if (entry.expiresAt && entry.expiresAt < new Date()) {
          await prisma.cacheEntry.delete({ where: { key } }).catch(() => {});
          return null;
        }
        return entry.value;
      }
    );
  }

  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    // Parse TTL (e.g., 'EX', 3600)
    let seconds: number | null = null;
    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === 'string' && args[i].toUpperCase() === 'EX') {
        const val = parseInt(args[i + 1]);
        if (!isNaN(val)) seconds = val;
      }
    }
    const expiresAt = seconds ? new Date(Date.now() + seconds * 1000) : null;

    return this.runWithFallback(
      async () => {
        await (rawRedis.set as any)(key, value, ...args);
        return 'OK';
      },
      async () => {
        await prisma.cacheEntry.upsert({
          where: { key },
          update: { value, expiresAt },
          create: { key, value, expiresAt },
        });
        return 'OK';
      }
    );
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    const expiresAt = new Date(Date.now() + seconds * 1000);
    return this.runWithFallback(
      () => rawRedis.setex(key, seconds, value),
      async () => {
        await prisma.cacheEntry.upsert({
          where: { key },
          update: { value, expiresAt },
          create: { key, value, expiresAt },
        });
        return 'OK';
      }
    );
  }

  async del(...keys: string[]): Promise<number> {
    // Flatten array if passed as array
    const flatKeys = keys.flat();
    if (flatKeys.length === 0) return 0;

    return this.runWithFallback(
      () => rawRedis.del(...flatKeys),
      async () => {
        const result = await prisma.cacheEntry.deleteMany({
          where: { key: { in: flatKeys } },
        });
        return result.count;
      }
    );
  }

  async incr(key: string): Promise<number> {
    return this.runWithFallback(
      () => rawRedis.incr(key),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        let val = 1;
        if (entry) {
          const parsed = parseInt(entry.value);
          if (!isNaN(parsed)) val = parsed + 1;
        }
        await prisma.cacheEntry.upsert({
          where: { key },
          update: { value: String(val) },
          create: { key, value: String(val) },
        });
        return val;
      }
    );
  }

  async expire(key: string, seconds: number): Promise<number> {
    const expiresAt = new Date(Date.now() + seconds * 1000);
    return this.runWithFallback(
      () => rawRedis.expire(key, seconds),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry) return 0;
        await prisma.cacheEntry.update({
          where: { key },
          data: { expiresAt },
        });
        return 1;
      }
    );
  }

  async ttl(key: string): Promise<number> {
    return this.runWithFallback(
      () => rawRedis.ttl(key),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry || (entry.expiresAt && entry.expiresAt < new Date())) return -2;
        if (!entry.expiresAt) return -1;
        return Math.ceil((entry.expiresAt.getTime() - Date.now()) / 1000);
      }
    );
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.runWithFallback(
      () => rawRedis.zadd(key, score, member),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        let list: Array<{ score: number; member: string }> = entry ? JSON.parse(entry.value) : [];
        list = list.filter(item => item.member !== member);
        list.push({ score, member });
        list.sort((a, b) => a.score - b.score);
        await prisma.cacheEntry.upsert({
          where: { key },
          update: { value: JSON.stringify(list) },
          create: { key, value: JSON.stringify(list) },
        });
        return 1;
      }
    );
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    return this.runWithFallback(
      () => rawRedis.zremrangebyrank(key, start, stop),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry) return 0;
        let list: Array<{ score: number; member: string }> = JSON.parse(entry.value);
        const len = list.length;
        const actualStart = start < 0 ? len + start : start;
        const actualStop = stop < 0 ? len + stop : stop;
        const beforeLen = list.length;
        list = list.filter((_, idx) => idx < actualStart || idx > actualStop);
        await prisma.cacheEntry.update({
          where: { key },
          data: { value: JSON.stringify(list) },
        });
        return beforeLen - list.length;
      }
    );
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.runWithFallback(
      () => rawRedis.zrevrange(key, start, stop),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry) return [];
        const list: Array<{ score: number; member: string }> = JSON.parse(entry.value);
        const sorted = [...list].sort((a, b) => b.score - a.score);
        const actualStop = stop < 0 ? sorted.length : stop + 1;
        return sorted.slice(start, actualStop).map(item => item.member);
      }
    );
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.runWithFallback(
      () => rawRedis.hset(key, field, value),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        const dict: Record<string, string> = entry ? JSON.parse(entry.value) : {};
        dict[field] = value;
        await prisma.cacheEntry.upsert({
          where: { key },
          update: { value: JSON.stringify(dict) },
          create: { key, value: JSON.stringify(dict) },
        });
        return 1;
      }
    );
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.runWithFallback(
      () => rawRedis.hdel(key, field),
      async () => {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry) return 0;
        const dict: Record<string, string> = JSON.parse(entry.value);
        if (!(field in dict)) return 0;
        delete dict[field];
        await prisma.cacheEntry.update({
          where: { key },
          data: { value: JSON.stringify(dict) },
        });
        return 1;
      }
    );
  }

  async keys(pattern: string): Promise<string[]> {
    return this.runWithFallback(
      () => rawRedis.keys(pattern),
      async () => {
        const regexStr = '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
        const regex = new RegExp(regexStr);
        const entries = await prisma.cacheEntry.findMany({ select: { key: true } });
        return entries.map(e => e.key).filter(k => regex.test(k));
      }
    );
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      return await rawRedis.publish(channel, message);
    } catch {
      return 0;
    }
  }

  duplicate() {
    try {
      return rawRedis.duplicate();
    } catch {
      return rawRedis as any;
    }
  }

  on(event: string, listener: (...args: any[]) => void) {
    rawRedis.on(event, listener);
    return this;
  }
}

export const redis = new FallbackRedis() as unknown as Omit<Redis, 'then'>;
