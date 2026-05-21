import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    take: 5000,
    include: {
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
      variants: { select: { stockCount: true } },
    },
  });

  const headers = [
    'id',
    'title',
    'slug',
    'basePrice',
    'condition',
    'published',
    'category',
    'seller',
    'totalStock',
    'createdAt',
  ];
  const rows = products.map(p => [
    p.id,
    p.title,
    p.slug,
    p.basePrice.toString(),
    p.condition,
    p.published ? 'true' : 'false',
    p.category?.name ?? '',
    p.seller?.storeName ?? '',
    p.variants.reduce((s, v) => s + v.stockCount, 0),
    p.createdAt.toISOString(),
  ]);

  const csv = headers.join(',') + '\n' + rows.map(r => r.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${Date.now()}.csv"`,
    },
  });
}
