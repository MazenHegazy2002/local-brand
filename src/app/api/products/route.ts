import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';

// GET /api/products?page=1&limit=12&category=&q=&minPrice=&maxPrice=&sort=&brand=&rating=&tags=&condition=&inStock=&flashSale=&gender=&ageGroup=&material=&ids=id1,id2,...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession(authOptions);

    const sanitizeProducts = (list: any[]) => {
      if (session) return list;
      return list.map(p => ({
        id: p.id,
        title: p.title,
        titleAr: p.titleAr,
        slug: p.slug,
        description: p.description,
        descriptionAr: p.descriptionAr,
        basePrice: p.basePrice,
        flashSalePrice: p.flashSalePrice,
        flashSaleStartsAt: p.flashSaleStartsAt,
        flashSaleEndsAt: p.flashSaleEndsAt,
        brand: p.brand,
        material: p.material,
        gender: p.gender,
        ageGroup: p.ageGroup,
        condition: p.condition,
        isVerifiedLocal: p.isVerifiedLocal,
        images: p.images,
        category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
        seller: p.seller ? { storeName: p.seller.storeName } : null,
        variants: p.variants
          ? p.variants.map((v: any) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              price: v.price,
              stockCount: v.stockCount,
            }))
          : [],
        reviews: p.reviews,
        _count: p._count,
      }));
    };

    // Special-case: batch fetch by explicit ids (used by RecentlyViewed and compare).
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .slice(0, 50); // hard cap to prevent abuse
      if (ids.length === 0) {
        return NextResponse.json({ products: [] }, { status: 200 });
      }
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, published: true, deletedAt: null },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true } },
          category: { select: { name: true, slug: true } },
        },
      });
      return NextResponse.json({ products: sanitizeProducts(products) }, { status: 200 });
    }

    const rawPage = parseInt(searchParams.get('page') || '1');
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

    const rawLimit = parseInt(searchParams.get('limit') || '12');
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 12 : Math.min(48, rawLimit);

    const skip = (page - 1) * limit;
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';

    const rawMinPrice = parseFloat(searchParams.get('minPrice') || '0');
    const minPrice = isNaN(rawMinPrice) || rawMinPrice < 0 ? 0 : rawMinPrice;

    const rawMaxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const maxPrice = isNaN(rawMaxPrice) || rawMaxPrice < 0 ? 999999 : rawMaxPrice;

    const sort = searchParams.get('sort') || 'newest';
    const rating = parseInt(searchParams.get('rating') || '0');
    const tags = searchParams.get('tags') || '';
    const condition = searchParams.get('condition') || '';
    const inStock = searchParams.get('inStock') === 'true';
    const flashSale = searchParams.get('flashSale') === 'true';
    const gender = searchParams.get('gender') || '';
    const ageGroup = searchParams.get('ageGroup') || '';
    const material = searchParams.get('material') || '';

    const isDefaultQuery =
      page === 1 &&
      limit === 12 &&
      !q &&
      !category &&
      !brand &&
      minPrice === 0 &&
      maxPrice === 999999 &&
      sort === 'newest' &&
      rating === 0 &&
      !tags &&
      !condition &&
      !inStock &&
      !flashSale &&
      !gender &&
      !ageGroup &&
      !material &&
      !idsParam;

    if (isDefaultQuery) {
      try {
        const cached = await redis.get('products:default');
        if (cached) {
          const parsed = JSON.parse(cached);
          return NextResponse.json(
            {
              products: sanitizeProducts(parsed.products),
              pagination: parsed.pagination,
            },
            {
              status: 200,
              headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
              },
            }
          );
        }
      } catch (err) {
        console.warn('[products] Redis cache read failed:', err);
      }
    }

    const where: Prisma.ProductWhereInput = {
      published: true,
      deletedAt: null,
      basePrice: { gte: minPrice, lte: maxPrice },
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (brand) {
      const sellers = await prisma.sellerProfile.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true, storeName: true },
      });
      const matchedSeller = sellers.find(
        s => s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === brand.toLowerCase()
      );
      if (matchedSeller) {
        where.sellerId = matchedSeller.id;
      } else {
        where.seller = { storeName: brand };
      }
    }

    if (condition) {
      where.condition = condition.toUpperCase();
    }

    if (flashSale) {
      where.flashSalePrice = { not: null };
      where.flashSaleEndsAt = { gt: new Date() };
    }

    if (inStock) {
      where.variants = {
        some: {
          stockCount: { gt: 0 },
        },
      };
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      where.tags = {
        some: {
          slug: { in: tagList },
        },
      };
    }

    if (gender) {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    if (ageGroup) {
      where.ageGroup = { equals: ageGroup, mode: 'insensitive' };
    }

    if (material) {
      where.material = { contains: material, mode: 'insensitive' };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price-asc':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price-desc':
        orderBy = { basePrice: 'desc' };
        break;
      case 'rating':
        orderBy = { reviews: { _count: 'desc' } };
        break;
      case 'featured':
        orderBy = { isFeatured: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // When a rating floor is applied we have to fetch the full filtered set
    // (capped at 500 for safety) and filter in code, because aggregate avg
    // rating isn't directly queryable from Prisma without a raw join.
    // Otherwise we paginate in the DB as normal.
    if (rating > 0) {
      const candidates = await prisma.product.findMany({
        where,
        orderBy,
        include: {
          images: true,
          seller: { select: { storeName: true } },
          category: { select: { name: true, slug: true } },
          tags: true,
          _count: { select: { reviews: true } },
          reviews: { select: { rating: true } },
          variants: true,
        },
        take: 500,
      });

      const filtered = candidates.filter(p => {
        if (p.reviews.length === 0) return false;
        const avg = p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length;
        return avg >= rating;
      });

      const total = filtered.length;
      const products = filtered.slice(skip, skip + limit);

      return NextResponse.json(
        {
          products: sanitizeProducts(products),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
        { status: 200 }
      );
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: true,
          seller: { select: { storeName: true } },
          category: { select: { name: true, slug: true } },
          tags: true,
          _count: { select: { reviews: true } },
          reviews: { select: { rating: true } },
          variants: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    if (isDefaultQuery) {
      try {
        await redis.set(
          'products:default',
          JSON.stringify({
            products,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrev: page > 1,
            },
          }),
          'EX',
          60
        );
      } catch (err) {
        console.warn('[products] Redis cache write failed:', err);
      }
    }

    return NextResponse.json(
      {
        products: sanitizeProducts(products),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      {
        status: 200,
        headers: {
          // Public listing: 30 s fresh at CDN edge, 60 s stale-while-revalidate
          // Auth-filtered requests (search by user) are not cached differently
          // because this route has no auth gate — all results are public.
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Products API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
