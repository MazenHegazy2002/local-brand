import { NextRequest, NextResponse } from 'next/server';
import type { OrderStatus, Prisma } from '@/generated/client';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';

const STATUSES = new Set([
  'PENDING_PAYMENT',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
]);

// GET /api/admin/orders?status=&q=&page= — newest first, 20 per page.
// Status changes go through PATCH /api/admin/orders/[id].
export async function GET(req: NextRequest) {
  if ((await getRequestUser(req))?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  // status may be a comma list, e.g. CONFIRMED,PROCESSING for "to fulfil".
  const statuses = (sp.get('status') ?? '').split(',').filter(x => STATUSES.has(x));
  const q = (sp.get('q') ?? '').trim();
  const page = Math.max(1, parseInt(sp.get('page') || '1') || 1);
  const take = 20;

  const where: Prisma.OrderWhereInput = {
    ...(statuses.length ? { status: { in: statuses as OrderStatus[] } } : {}),
    ...(q
      ? {
          OR: [
            { id: { startsWith: q.replace(/^#/, '').toLowerCase() } },
            { guestEmail: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentReceiptUrl: true,
        paymentReference: true,
        paymentSenderDetail: true,
        shippingAddressSnapshot: true,
        createdAt: true,
        guestEmail: true,
        user: { select: { name: true, email: true, phone: true } },
        items: {
          select: {
            id: true,
            productTitleSnapshot: true,
            sellerNameSnapshot: true,
            priceAtPurchase: true,
            quantity: true,
            selectedSize: true,
            selectedColor: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
  ]);

  return NextResponse.json({
    orders: orders.map(({ shippingAddressSnapshot, ...o }) => {
      let address: Record<string, string> = {};
      try {
        address = JSON.parse(shippingAddressSnapshot || '{}');
      } catch {}
      return { ...o, address };
    }),
    total,
    page,
    totalPages: Math.ceil(total / take),
    counts: Object.fromEntries(counts.map(c => [c.status, c._count])),
  });
}
