import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { createProductForSeller } from '@/lib/seller-core';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/client';
import { CORS_HEADERS, LOW_STOCK_THRESHOLD } from '@/lib/seller-mobile';

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: CORS_HEADERS });

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') return json({ error: 'Forbidden' }, 403);

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return json({ error: 'Seller profile not found' }, 404);

  const filter = new URL(req.url).searchParams.get('filter');
  const where: Prisma.ProductWhereInput = { sellerId: seller.id, deletedAt: null };
  if (filter === 'draft') where.published = false;
  else if (filter === 'live') where.published = true;
  else if (filter === 'low_stock')
    where.variants = { some: { stockCount: { lte: LOW_STOCK_THRESHOLD } } };

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      title: true,
      basePrice: true,
      published: true,
      category: { select: { name: true } },
      images: { select: { url: true, isPrimary: true }, orderBy: { isPrimary: 'desc' } },
      variants: { select: { stockCount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return json({
    products: products.map(p => {
      const totalStock = p.variants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0);
      return {
        id: p.id,
        title: p.title,
        basePrice: Number(p.basePrice),
        published: p.published,
        images: p.images.map(i => i.url),
        stock: totalStock,
        image: p.images[0]?.url ?? null,
        totalStock,
        variantCount: p.variants.length,
        lowStock: p.variants.some(v => v.stockCount <= LOW_STOCK_THRESHOLD),
        categoryName: p.category?.name ?? null,
      };
    }),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' },
  });
}

interface CreateBody {
  title?: string;
  titleAr?: string;
  description?: string;
  basePrice?: number;
  categoryId?: string;
  weightKg?: number;
  images?: unknown[];
  variants?: { color?: string; size?: string; stock?: number }[];
  published?: boolean;
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  // Same as the web createProduct action: sellers only.
  if (user.role !== 'SELLER') return json({ error: 'Forbidden' }, 403);

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body) return json({ error: 'Invalid JSON body' }, 400);

  const catKey = String(body.categoryId ?? '').trim();
  const category = catKey
    ? await prisma.category.findFirst({
        where: { OR: [{ id: catKey }, { slug: catKey }] },
        select: { id: true },
      })
    : null;
  if (!category) return json({ error: 'Pick a valid category.' }, 400);

  const images = (Array.isArray(body.images) ? body.images : []).filter(
    (u): u is string => typeof u === 'string' && u.length > 0
  );
  const variants = (Array.isArray(body.variants) ? body.variants : []).slice(0, 100);

  const result = await createProductForSeller(user.id, {
    title: String(body.title ?? ''),
    titleAr: body.titleAr?.trim() || undefined,
    description: body.description,
    basePrice: Number(body.basePrice),
    weightKg: Number(body.weightKg),
    categoryId: category.id,
    published: body.published !== false,
    mainImage: images[0],
    extraImages: images.slice(1),
    // One ProductVariant per (color, size) row, stored in the web's
    // `{color, sizes:[size]}` shape so ProductDetails expands it unchanged.
    variants: variants.map(v => ({
      color: String(v.color ?? '').trim() || undefined,
      sizes: v.size ? [String(v.size).trim()] : [],
      stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
    })),
  });

  if (result.error) return json({ error: result.error }, 400);
  return json(
    {
      id: result.id,
      published: result.published,
      ...(result.publishBlockedReason ? { publishBlockedReason: result.publishBlockedReason } : {}),
    },
    201
  );
}
