import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { updateOrderItemStatusCore } from '@/lib/seller-core';
import { changeOrderStatus } from '@/lib/order-status';
import { CORS_HEADERS } from '@/lib/seller-mobile';

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: CORS_HEADERS });

// POST /api/seller/orders/[id]  { action: 'accept' | 'ship' }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') return json({ error: 'Forbidden' }, 403);

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller) return json({ error: 'Seller profile not found' }, 404);

  const { id } = await ctx.params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };

  const myItems = await prisma.orderItem.findMany({
    where: { orderId: id, variant: { product: { sellerId: seller.id } } },
    select: { id: true, status: true },
  });
  if (myItems.length === 0) return json({ error: 'Order not found' }, 404);

  if (action === 'accept') {
    const pending = myItems.filter(i => i.status === 'PENDING');
    if (pending.length === 0) return json({ error: 'Nothing to accept' }, 409);
    for (const item of pending) {
      const r = await updateOrderItemStatusCore(user, item.id, 'CONFIRMED');
      if (r.error) return json({ error: r.error }, 400);
    }
    return json({ ok: true, status: 'accepted' });
  }

  if (action === 'ship') {
    // Same path as the web "Ship" button: order must be PROCESSING (all sellers accepted).
    const r = await changeOrderStatus(user, id, 'SHIPPED');
    if (!r.ok) return json({ error: r.message }, r.httpStatus);
    return json({ ok: true, status: 'shipped' });
  }

  return json({ error: "action must be 'accept' or 'ship'" }, 400);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
  });
}
