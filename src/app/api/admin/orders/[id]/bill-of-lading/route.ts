// GET /api/admin/orders/[id]/bill-of-lading[?item=<orderItemId>]
// Printable bill of lading — one page per product in the order (or just one item).
// Admins and co-admins only; opens as a preview with a Print button.
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { orderNumber } from '@/lib/seller-mobile';

const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

const egp = (n: number) =>
  `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

const PAYMENT_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on delivery',
  INSTAPAY: 'InstaPay (prepaid)',
  VODAFONE_CASH: 'Vodafone Cash (prepaid)',
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user) return new NextResponse('Please sign in.', { status: 401 });
  if (user.role !== 'ADMIN' && user.role !== 'CO_ADMIN')
    return new NextResponse('Forbidden', { status: 403 });

  const { id } = await ctx.params;
  const onlyItem = req.nextUrl.searchParams.get('item');

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      totalAmount: true,
      shippingFee: true,
      orderNotes: true,
      giftWrapping: true,
      shippingAddressSnapshot: true,
      guestEmail: true,
      user: { select: { name: true, phone: true, email: true } },
      shipments: { select: { courier: true, trackingNumber: true }, take: 1 },
      items: {
        select: {
          id: true,
          quantity: true,
          status: true,
          priceAtPurchase: true,
          productTitleSnapshot: true,
          sellerNameSnapshot: true,
          selectedSize: true,
          selectedColor: true,
          variant: {
            select: {
              sku: true,
              product: {
                select: {
                  title: true,
                  weightGrams: true,
                  seller: {
                    select: {
                      storeName: true,
                      pickupContactName: true,
                      pickupStreet: true,
                      pickupBuilding: true,
                      pickupZone: true,
                      city: true,
                      governorate: true,
                      pickupPhone: true,
                      user: { select: { phone: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!order) return new NextResponse('Order not found', { status: 404 });

  const items = order.items.filter(i => i.status !== 'CANCELLED');
  const pages = onlyItem ? items.filter(i => i.id === onlyItem) : items;
  if (pages.length === 0)
    return new NextResponse('No products to ship on this order', { status: 404 });

  let addr: Record<string, string | undefined> = {};
  try {
    addr = JSON.parse(order.shippingAddressSnapshot || '{}');
  } catch {
    /* older orders may not have a JSON snapshot */
  }
  const consigneeAddress = [
    addr.street,
    addr.building,
    addr.city,
    addr.governorate || addr.state,
    addr.postalCode || addr.zipCode,
    addr.country || 'Egypt',
  ]
    .filter(Boolean)
    .join(', ');

  const ref = orderNumber(order.id);
  const date = order.createdAt.toLocaleString('en-GB', { timeZone: 'Africa/Cairo' });
  const printed = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo' });
  const shipment = order.shipments[0];
  const isCod = order.paymentMethod === 'CASH_ON_DELIVERY';
  const payment = PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod.replace(/_/g, ' ');

  const sheet = (item: (typeof items)[number]) => {
    const n = items.indexOf(item) + 1;
    const product = item.variant.product;
    const s = product.seller;
    const shipperAddress = [
      s?.pickupStreet,
      s?.pickupBuilding,
      s?.pickupZone,
      s?.city,
      s?.governorate,
    ]
      .filter(Boolean)
      .join(', ');
    const opts = [item.selectedColor, item.selectedSize].filter(Boolean).join(' / ');
    const value = item.priceAtPurchase * item.quantity;
    const weight = product.weightGrams
      ? `${((product.weightGrams * item.quantity) / 1000).toFixed(2)} kg`
      : '—';
    return `<section class="sheet">
  <header>
    <div><div class="title">BILL OF LADING</div><div class="muted">Brandyy · brandyy.shop</div></div>
    <div class="right"><div class="bol">BOL-${esc(ref)}-${String(n).padStart(2, '0')}</div>
      <div>Parcel <strong>${n} of ${items.length}</strong></div></div>
  </header>
  <table class="meta"><tr>
    <td><span class="lbl">Order</span>#${esc(ref)}</td>
    <td><span class="lbl">Order date</span>${esc(date)}</td>
    <td><span class="lbl">Status</span>${esc(order.status.replace(/_/g, ' '))}</td>
    <td><span class="lbl">Courier / tracking</span>${esc(shipment?.courier || '—')}${shipment?.trackingNumber ? ` · ${esc(shipment.trackingNumber)}` : ''}</td>
  </tr></table>
  <div class="parties">
    <div class="box"><div class="lbl">Shipper (pickup)</div>
      <div class="big">${esc(s?.storeName || item.sellerNameSnapshot)}</div>
      ${s?.pickupContactName ? `<div>${esc(s.pickupContactName)}</div>` : ''}
      <div>${esc(shipperAddress || 'Pickup address not set')}</div>
      <div>${esc(s?.pickupPhone || s?.user.phone || '')}</div></div>
    <div class="box"><div class="lbl">Consignee (deliver to)</div>
      <div class="big">${esc(addr.fullName || addr.name || order.user?.name || 'Customer')}</div>
      <div>${esc(consigneeAddress)}</div>
      <div>${esc(addr.phone || order.user?.phone || '')}</div></div>
  </div>
  <table class="goods">
    <thead><tr><th>Description of goods</th><th>SKU</th><th>Qty</th><th>Weight</th><th>Declared value</th></tr></thead>
    <tbody><tr>
      <td><strong>${esc(item.productTitleSnapshot || product.title)}</strong>${opts ? `<br><span class="muted">${esc(opts)}</span>` : ''}</td>
      <td>${esc(item.variant.sku)}</td><td>${esc(item.quantity)}</td><td>${esc(weight)}</td><td>${esc(egp(value))}</td>
    </tr></tbody>
  </table>
  <div class="pay ${isCod ? 'cod' : ''}">
    ${isCod ? `CASH ON DELIVERY — collect ${esc(egp(order.totalAmount))} for the whole order${items.length > 1 ? ` (${items.length} parcels)` : ''}` : `${esc(payment)} — ${order.paymentStatus === 'PAID' ? 'PAID, collect nothing' : 'payment ' + esc(order.paymentStatus.toLowerCase())}`}
  </div>
  ${order.orderNotes || order.giftWrapping ? `<div class="box notes"><span class="lbl">Notes</span>${order.giftWrapping ? '🎁 Gift wrapping. ' : ''}${esc(order.orderNotes || '')}</div>` : ''}
  <div class="signs">
    <div><div class="line"></div>Shipper signature &amp; date</div>
    <div><div class="line"></div>Courier signature &amp; date</div>
    <div><div class="line"></div>Received by (consignee) &amp; date</div>
  </div>
  <footer class="muted">Printed ${esc(printed)} · Goods received in apparent good order unless noted.</footer>
</section>`;
  };

  // The proxy CSP forbids inline handlers; it forwards its per-request nonce as x-nonce.
  const nonce = req.headers.get('x-nonce') || '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bill of lading #${esc(ref)}</title>
<style>
@page{size:A5;margin:8mm}*{box-sizing:border-box}
body{font:12px/1.4 Arial,Helvetica,sans-serif;margin:0;color:#111;background:#e2e8f0}
.bar{position:sticky;top:0;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 16px;background:#0f172a;color:#fff}
.bar button{font:600 13px Arial;padding:8px 16px;border:0;border-radius:6px;background:#22c55e;color:#04120a;cursor:pointer}
.sheet{background:#fff;width:148mm;min-height:200mm;margin:16px auto;padding:8mm;box-shadow:0 1px 4px rgba(0,0,0,.15);display:flex;flex-direction:column;gap:8px}
header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:6px}
.title{font-size:18px;font-weight:800;letter-spacing:.5px}.right{text-align:right}.bol{font:700 15px monospace}
.muted{color:#555;font-size:11px}.lbl{display:block;font-size:9px;text-transform:uppercase;color:#555;letter-spacing:.4px}
.big{font-size:14px;font-weight:700}
table{width:100%;border-collapse:collapse}.meta td{border:1px solid #111;padding:4px 6px;vertical-align:top;width:25%}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:8px}.box{border:1.5px solid #111;padding:6px}
.goods th,.goods td{border:1px solid #111;padding:5px 6px;text-align:left;vertical-align:top}.goods th{background:#f1f5f9;font-size:10px;text-transform:uppercase}
.pay{border:2px solid #111;padding:8px;text-align:center;font-weight:700;font-size:13px}.pay.cod{font-size:14px}
.signs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:auto;font-size:10px;color:#333}.line{border-bottom:1px solid #111;height:28px;margin-bottom:3px}
footer{text-align:center}
@media print{body{background:#fff}.bar{display:none}.sheet{margin:0;box-shadow:none;width:auto;min-height:auto;page-break-after:always}.sheet:last-child{page-break-after:auto}}
</style></head><body>
<div class="bar"><div><strong>Bill of lading · #${esc(ref)}</strong> — ${pages.length} page${pages.length === 1 ? '' : 's'} (one per product)</div><button id="print">🖨️ Print</button></div>
${pages.map(sheet).join('\n')}
<script nonce="${esc(nonce)}">document.getElementById('print').addEventListener('click',function(){window.print()})</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
