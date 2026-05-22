import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl && process.env.NODE_ENV === 'production') {
  console.error('[redis] REDIS_URL is not set in production!');
}

export const redis = new Redis(redisUrl || 'redis://localhost:6379', {
  // Avoid connection attempts during module import / boot.
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 5_000,
  enableOfflineQueue: false,
});

// Prevent noisy unhandled error events from crashing or polluting logs.
let lastRedisErrorTime = 0;
let lastRedisErrorMessage = '';

redis.on('error', error => {
  const msg = (error instanceof Error ? error.message : String(error)).trim();
  if (!msg) return; // Suppress empty errors completely!

  const now = Date.now();
  // Suppress duplicate warnings if they occur within 10 seconds of each other
  if (msg === lastRedisErrorMessage && now - lastRedisErrorTime < 10000) {
    return;
  }

  lastRedisErrorMessage = msg;
  lastRedisErrorTime = now;
  console.warn(`[redis] ${msg}`);
});
