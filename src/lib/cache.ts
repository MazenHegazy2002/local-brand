import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// Cache wrapper with Redis
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  try {
    // Try cache first
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (e) {
    console.error('Redis get error:', e);
  }

  // Fetch fresh data
  const data = await fetcher();

  try {
    // Cache the result
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (e) {
    console.error('Redis set error:', e);
  }

  return data;
}

export async function invalidateCache(pattern: string) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (e) {
    console.error('Redis invalidate error:', e);
  }
}

// Cached queries
export async function getCachedCategories() {
  return getCachedData(
    'categories:all',
    () => prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
    600 // 10 minutes
  );
}

export async function getCachedFeaturedProducts() {
  return getCachedData(
    'products:featured',
    () => prisma.product.findMany({ 
      where: { isFeatured: true, published: true }, 
      take: 8,
      include: { images: true, category: true }
    }),
    300 // 5 minutes
  );
}

export async function getCachedProducts(params: { q?: string, category?: string, limit?: number }) {
  const cacheKey = `products:search:${JSON.stringify(params)}`;
  return getCachedData(
    cacheKey,
    () => {
      const where: any = { published: true };
      if (params.q) {
        where.OR = [
          { title: { contains: params.q, mode: 'insensitive' } },
          { description: { contains: params.q, mode: 'insensitive' } }
        ];
      }
      if (params.category && params.category !== 'all') {
        where.category = { slug: params.category };
      }
      return prisma.product.findMany({
        where,
        take: params.limit || 20,
        include: { images: true, category: true, variants: true },
        orderBy: { createdAt: 'desc' }
      });
    },
    180 // 3 minutes
  );
}
