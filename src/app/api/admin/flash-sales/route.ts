import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Schema ────────────────────────────────────────────────────────────────
const setFlashSaleSchema = z.object({
  productId: z.string().min(1),
  flashSalePrice: z.number().positive(),
  flashSaleStartsAt: z.string().datetime().nullable().optional(),
  flashSaleEndsAt: z.string().datetime(),
  flashSaleLimit: z.number().int().positive().nullable().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
  });
  return user?.role === 'ADMIN' ? session : null;
}

// ─── GET /api/admin/flash-sales ────────────────────────────────────────────
// Returns ALL products that have flash sale fields set (active, upcoming, expired).
// Query param ?status=active|upcoming|expired|all (default: all)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const now = new Date();

  // Build where clause based on status filter
  let whereFilter = {};
  if (status === 'active') {
    whereFilter = {
      flashSalePrice: { not: null },
      flashSaleEndsAt: { gt: now },
      OR: [{ flashSaleStartsAt: null }, { flashSaleStartsAt: { lte: now } }],
    };
  } else if (status === 'upcoming') {
    whereFilter = {
      flashSalePrice: { not: null },
      flashSaleStartsAt: { gt: now },
      flashSaleEndsAt: { gt: now },
    };
  } else if (status === 'expired') {
    whereFilter = {
      flashSalePrice: { not: null },
      flashSaleEndsAt: { lte: now },
    };
  } else {
    // 'all' — any product with a flash sale price set
    whereFilter = { flashSalePrice: { not: null } };
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...whereFilter,
      },
      select: {
        id: true,
        title: true,
        basePrice: true,
        flashSalePrice: true,
        flashSaleStartsAt: true,
        flashSaleEndsAt: true,
        flashSaleLimit: true,
        published: true,
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        seller: { select: { storeName: true } },
        category: { select: { name: true } },
        variants: { select: { stockCount: true } },
      },
      orderBy: { flashSaleEndsAt: 'asc' },
      take: 200,
    });

    const result = products.map(({ variants, basePrice, flashSalePrice, ...p }) => ({
      ...p,
      basePrice: Number(basePrice),
      flashSalePrice: flashSalePrice != null ? Number(flashSalePrice) : null,
      stockCount: variants.reduce(
        (sum: number, v: { stockCount: number }) => sum + v.stockCount,
        0
      ),
    }));

    return NextResponse.json({ products: result });
  } catch (err) {
    console.error('[admin/flash-sales] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── POST /api/admin/flash-sales ──────────────────────────────────────────
// Set or update a flash sale on a product.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = setFlashSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, flashSalePrice, flashSaleStartsAt, flashSaleEndsAt, flashSaleLimit } =
    parsed.data;

  // Validate price makes sense
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { basePrice: true },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  if (flashSalePrice >= product.basePrice) {
    return NextResponse.json(
      { error: 'Flash sale price must be lower than base price' },
      { status: 422 }
    );
  }

  const endsAt = new Date(flashSaleEndsAt);
  if (endsAt <= new Date()) {
    return NextResponse.json({ error: 'End time must be in the future' }, { status: 422 });
  }

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        flashSalePrice,
        flashSaleStartsAt: flashSaleStartsAt ? new Date(flashSaleStartsAt) : null,
        flashSaleEndsAt: endsAt,
        flashSaleLimit: flashSaleLimit ?? null,
      },
      select: {
        id: true,
        title: true,
        flashSalePrice: true,
        flashSaleStartsAt: true,
        flashSaleEndsAt: true,
        flashSaleLimit: true,
      },
    });

    return NextResponse.json({ product: updated });
  } catch (err) {
    console.error('[admin/flash-sales] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
