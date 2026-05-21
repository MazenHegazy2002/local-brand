// CSV export for orders. Streams as a CSV download with content-disposition.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // RFC4180 — wrap in quotes when there's a quote, comma or newline.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: {
      user: { select: { email: true, name: true } },
      items: {
        select: { id: true, productTitleSnapshot: true, quantity: true, priceAtPurchase: true },
      },
    },
  });

  const headers = [
    'id',
    'createdAt',
    'status',
    'paymentMethod',
    'paymentStatus',
    'totalAmount',
    'discountAmount',
    'shippingFee',
    'customerEmail',
    'customerName',
    'guestEmail',
    'itemsCount',
    'itemsSummary',
  ];

  const rows = orders.map(o => [
    o.id,
    o.createdAt.toISOString(),
    o.status,
    o.paymentMethod,
    o.paymentStatus,
    o.totalAmount.toString(),
    o.discountAmount.toString(),
    o.shippingFee.toString(),
    o.user?.email ?? '',
    o.user?.name ?? '',
    o.guestEmail ?? '',
    o.items.length,
    o.items.map(i => `${i.quantity}× ${i.productTitleSnapshot}`).join('; '),
  ]);

  const csv = headers.join(',') + '\n' + rows.map(r => r.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${Date.now()}.csv"`,
    },
  });
}
