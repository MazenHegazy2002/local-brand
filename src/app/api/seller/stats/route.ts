import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import {
  CORS_HEADERS,
  LOW_STOCK_THRESHOLD,
  VISIBLE_ORDER_WHERE,
  deriveSellerOrderStatus,
} from '@/lib/seller-mobile';
import { cairoDay, getStoreVisits } from '@/lib/store-visits';

type Range = 'today' | '7d' | '30d';
const DAY = 86_400_000;
const HOUR_LABELS = ['12a', '4a', '8a', '12p', '4p', '8p'];

/** Africa/Cairo wall-clock time of `d`, expressed as a UTC epoch (so UTC getters read Cairo fields). */
function cairoWall(d: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(d)
      .map(x => [x.type, x.value])
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const rp = new URL(req.url).searchParams.get('range');
  const range: Range = rp === 'today' || rp === '30d' ? rp : '7d';

  // Buckets are computed on Cairo wall-clock; `offset` converts back to real instants.
  // ponytail: offset taken at "now", so a DST switch inside the window skews edges by 1h.
  const now = new Date();
  const wallNow = cairoWall(now);
  const offset = wallNow - now.getTime();
  const wallMidnight = wallNow - (wallNow % DAY);
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
  const bucketMs = range === 'today' ? 4 * 3_600_000 : DAY;
  const bucketCount = range === 'today' ? 6 : days;
  const wallStart = wallMidnight - (days - 1) * DAY;
  const periodMs = days * DAY;
  const start = new Date(wallStart - offset);
  const prevStart = new Date(wallStart - periodMs - offset);

  const labels = Array.from({ length: bucketCount }, (_, i) => {
    if (range === 'today') return HOUR_LABELS[i];
    const d = new Date(wallStart + i * DAY);
    return range === '7d' ? 'SMTWTFS'[d.getUTCDay()] : String(d.getUTCDate());
  });
  const visitDays = Array.from({ length: days }, (_, i) =>
    cairoDay(new Date(wallStart + i * DAY - offset + 12 * 3_600_000))
  );

  const sellerItem = { variant: { product: { sellerId: seller.id } } };

  const [sales, openItems, unreadNotifications, ratingAgg, lowStockVariants, storeVisits] =
    await Promise.all([
      prisma.orderItem.findMany({
        where: {
          ...sellerItem,
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED'] },
          order: {
            ...VISIBLE_ORDER_WHERE,
            status: { notIn: ['CANCELLED', 'RETURNED'] },
            createdAt: { gte: prevStart },
          },
        },
        select: {
          quantity: true,
          priceAtPurchase: true,
          order: { select: { id: true, createdAt: true } },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          ...sellerItem,
          order: {
            ...VISIBLE_ORDER_WHERE,
            status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'] },
          },
        },
        select: { status: true, order: { select: { id: true, status: true } } },
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.review.aggregate({
        where: { product: { sellerId: seller.id }, rating: { gt: 0 } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.productVariant.count({
        where: {
          product: { sellerId: seller.id, deletedAt: null },
          stockCount: { lte: LOW_STOCK_THRESHOLD },
        },
      }),
      getStoreVisits(seller.id, visitDays),
    ]);

  const series = labels.map(label => ({ label, value: 0 }));
  let netSales = 0;
  let prevSales = 0;
  const orderIds = new Set<string>();
  for (const it of sales) {
    const amount = Number(it.priceAtPurchase) * it.quantity;
    if (it.order.createdAt < start) {
      prevSales += amount;
      continue;
    }
    netSales += amount;
    orderIds.add(it.order.id);
    const idx = Math.floor((cairoWall(it.order.createdAt) - wallStart) / bucketMs);
    if (series[idx]) series[idx].value += amount;
  }

  const open = new Map<string, { status: string; items: string[] }>();
  for (const it of openItems) {
    const g = open.get(it.order.id) ?? { status: it.order.status, items: [] };
    g.items.push(it.status);
    open.set(it.order.id, g);
  }
  let newOrders = 0;
  let toShip = 0;
  for (const g of open.values()) {
    const s = deriveSellerOrderStatus(g.status, g.items);
    if (s === 'new') newOrders++;
    else if (s === 'accepted') toShip++;
  }

  const avg = ratingAgg._avg.rating;
  return NextResponse.json(
    {
      store: { name: seller.storeName, logoUrl: seller.logoUrl, status: seller.status },
      unreadNotifications,
      netSales: Math.round(netSales * 100) / 100,
      changePct: prevSales === 0 ? null : Math.round(((netSales - prevSales) / prevSales) * 100),
      series: series.map(s => ({ ...s, value: Math.round(s.value * 100) / 100 })),
      orders: orderIds.size,
      storeVisits,
      newOrders,
      toShip,
      rating: avg == null ? null : Math.round(avg * 10) / 10,
      reviewCount: ratingAgg._count._all,
      lowStockVariants,
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}
