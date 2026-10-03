import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import {
  CORS_HEADERS,
  deriveSellerOrderStatus,
  orderNumber,
  paymentLabel,
  statusInTab,
  type SellerOrderTab,
  VISIBLE_ORDER_WHERE,
} from '@/lib/seller-mobile';

const TABS: SellerOrderTab[] = ['all', 'new', 'to_ship', 'shipped', 'delivered'];

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

  const sp = new URL(req.url).searchParams;
  const tabParam = sp.get('tab') as SellerOrderTab | null;
  const tab: SellerOrderTab = tabParam && TABS.includes(tabParam) ? tabParam : 'all';
  const q = (sp.get('q') || '').trim().toLowerCase();

  // ponytail: loads the seller's latest 3000 items and groups in JS; move to SQL if a store outgrows it.
  const items = await prisma.orderItem.findMany({
    where: {
      variant: { product: { sellerId: seller.id } },
      order: VISIBLE_ORDER_WHERE,
    },
    select: {
      status: true,
      priceAtPurchase: true,
      quantity: true,
      productTitleSnapshot: true,
      variant: {
        select: {
          product: {
            select: {
              title: true,
              category: { select: { name: true } },
              images: { select: { url: true }, orderBy: { isPrimary: 'desc' }, take: 1 },
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          shippingAddressSnapshot: true,
        },
      },
    },
    orderBy: { order: { createdAt: 'desc' } },
    take: 3000,
  });

  type Group = { order: (typeof items)[number]['order']; items: typeof items };
  const groups = new Map<string, Group>();
  for (const it of items) {
    const g = groups.get(it.order.id) ?? { order: it.order, items: [] };
    g.items.push(it);
    groups.set(it.order.id, g);
  }

  const counts = { all: 0, new: 0, to_ship: 0, shipped: 0, delivered: 0 };
  const orders = [];
  for (const { order, items: its } of groups.values()) {
    const status = deriveSellerOrderStatus(
      order.status,
      its.map(i => i.status)
    );
    for (const t of TABS) if (statusInTab(status, t)) counts[t]++;
    if (!statusInTab(status, tab)) continue;

    const number = orderNumber(order.id);
    if (
      q &&
      !number.toLowerCase().includes(q) &&
      !its.some(i => (i.productTitleSnapshot || i.variant.product.title).toLowerCase().includes(q))
    )
      continue;
    if (orders.length >= 100) continue;

    let city: string | null = null;
    try {
      city = JSON.parse(order.shippingAddressSnapshot || '{}').city || null;
    } catch {}
    const first = its[0];
    orders.push({
      id: order.id,
      number,
      createdAt: order.createdAt.toISOString(),
      status,
      // Seller's share of the order (their items only), not the buyer's grand total.
      total: its.reduce((s, i) => s + Number(i.priceAtPurchase) * i.quantity, 0),
      itemCount: its.reduce((s, i) => s + i.quantity, 0),
      firstItem: {
        title: first.productTitleSnapshot || first.variant.product.title,
        image: first.variant.product.images[0]?.url ?? null,
        category: first.variant.product.category?.name ?? null,
        quantity: first.quantity,
      },
      city,
      paymentMethod: paymentLabel(order.paymentMethod),
    });
  }

  return NextResponse.json({ counts, orders }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}
