import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@/generated/client';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 30;

// GET /api/admin/products?status=all|active|draft&q=&page=
// Product list for the admin app (admins and co-admins).
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'CO_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') ?? 'all';
  const q = (sp.get('q') ?? '').trim();
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

  const base: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { seller: { storeName: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
  const where: Prisma.ProductWhereInput =
    status === 'active'
      ? { ...base, published: true }
      : status === 'draft'
        ? { ...base, published: false }
        : base;

  const [rows, total, active, draft] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        basePrice: true,
        published: true,
        seller: { select: { storeName: true } },
        images: { select: { url: true, isPrimary: true }, take: 3 },
        variants: { select: { stockCount: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...base, published: true } }),
    prisma.product.count({ where: { ...base, published: false } }),
  ]);

  return NextResponse.json({
    items: rows.map(p => ({
      id: p.id,
      title: p.title,
      basePrice: p.basePrice,
      published: p.published,
      storeName: p.seller?.storeName ?? null,
      image: (p.images.find(i => i.isPrimary) ?? p.images[0])?.url ?? null,
      stock: p.variants.reduce((a, v) => a + (v.stockCount || 0), 0),
    })),
    counts: { all: active + draft, active, draft },
    total,
    pageSize: PAGE_SIZE,
  });
}
