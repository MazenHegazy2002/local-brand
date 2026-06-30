import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const configs: Record<string, RateLimitConfig> = {
  '/api/auth': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 min
  '/api/payment': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  '/api/data': { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
  default: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
};

function normalizePath(pathname: string): string {
  let path = pathname.replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/:id');
  path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
  if (path.startsWith('/api/products/')) {
    const segments = path.split('/');
    if (segments.length === 4 && !['bulk-upload', 'evaluate', 'list'].includes(segments[3])) {
      segments[3] = ':id';
      path = segments.join('/');
    }
  }
  return path;
}

export async function rateLimit(req: NextRequest, customConfig?: Partial<RateLimitConfig>) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const url = req.nextUrl.pathname;

  // Find matching config
  let config = configs.default;
  for (const path of Object.keys(configs)) {
    if (url.startsWith(path)) {
      config = configs[path];
      break;
    }
  }

  if (customConfig) {
    config = { ...config, ...customConfig };
  }

  const normalizedUrl = normalizePath(url);
  const key = `ratelimit:${ip}:${normalizedUrl}`;
  const window = Math.floor(Date.now() / config.windowMs);
  const redisKey = `${key}:${window}`;

  try {
    const requests = await redis.incr(redisKey);
    if (requests === 1) {
      await redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }

    if (requests > config.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        reset: (window + 1) * config.windowMs,
      };
    }

    return {
      limited: false,
      remaining: config.maxRequests - requests,
      reset: (window + 1) * config.windowMs,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow the request
    return { limited: false, remaining: 999, reset: 0 };
  }
}
