import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { CACHE_TTL_SHORT, CACHE_TTL_MEDIUM } from '@/lib/constants';
import type { Prisma } from '@/generated/client';

// Cache wrapper with Redis & DB Fallback
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL_SHORT
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
    if (data !== undefined && data !== null) {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    }
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

// ── CACHED QUERIES ────────────────────────────────────────────────────────────

export async function getCachedCategories() {
  return getCachedData(
    'categories:all',
    () => prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
    CACHE_TTL_MEDIUM // 30 minutes
  );
}

export async function getCachedBanners() {
  const now = new Date();
  return getCachedData(
    'banners:active',
    () =>
      prisma.homepageBanner.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          subtitle: true,
          imageUrl: true,
          linkUrl: true,
          ctaLabel: true,
        },
      }),
    CACHE_TTL_SHORT // 5 minutes
  );
}

export async function getCachedFeaturedProducts() {
  return getCachedData(
    'products:featured',
    () =>
      prisma.product.findMany({
        where: { isFeatured: true, published: true, deletedAt: null },
        take: 8,
        include: { images: true, category: true },
      }),
    CACHE_TTL_SHORT // 5 minutes
  );
}

export async function getCachedProducts(params: { q?: string; category?: string; limit?: number }) {
  const cacheKey = `products:search:${JSON.stringify(params)}`;
  return getCachedData(
    cacheKey,
    () => {
      const where: Prisma.ProductWhereInput = { published: true, deletedAt: null };
      if (params.q) {
        where.OR = [
          { title: { contains: params.q, mode: 'insensitive' } },
          { description: { contains: params.q, mode: 'insensitive' } },
        ];
      }
      if (params.category && params.category !== 'all') {
        where.category = { slug: params.category };
      }
      return prisma.product.findMany({
        where,
        take: params.limit || 20,
        include: { images: true, category: true, variants: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    180 // 3 minutes
  );
}

export async function getCachedSingleProduct(idOrSlug: string) {
  const cacheKey = `product:detail:${idOrSlug}`;
  return getCachedData(
    cacheKey,
    () =>
      prisma.product.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
          published: true,
          deletedAt: null,
        },
        include: {
          images: true,
          category: true,
          variants: true,
          seller: {
            select: {
              id: true,
              storeName: true,
              logoUrl: true,
            },
          },
        },
      }),
    CACHE_TTL_SHORT // 5 minutes
  );
}

export async function getCachedCategoryProducts(categorySlug: string) {
  const cacheKey = `products:category:${categorySlug}`;
  return getCachedData(
    cacheKey,
    () =>
      prisma.product.findMany({
        where: {
          category: { slug: categorySlug },
          published: true,
          deletedAt: null,
        },
        include: { images: true, category: true, variants: true },
        orderBy: { createdAt: 'desc' },
      }),
    CACHE_TTL_SHORT // 5 minutes
  );
}

export async function getCachedShippingRate(
  destinationGovernorate: string,
  originGovernorate: string = 'cairo',
  weightGrams: number = 1000
) {
  const { resolveShippingRate } = await import('@/lib/shipping-helper');
  const cacheKey = `shipping:rate:${originGovernorate.toLowerCase()}:${destinationGovernorate.toLowerCase()}:${weightGrams}`;
  return getCachedData(
    cacheKey,
    () => resolveShippingRate(destinationGovernorate, originGovernorate, weightGrams),
    CACHE_TTL_SHORT // 5 minutes
  );
}
