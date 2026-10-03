import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import {
  CORS_HEADERS,
  LABEL_TTL_SECONDS,
  orderNumber,
  signLabel,
  verifyLabel,
} from '@/lib/seller-mobile';

const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

// POST → { url } : a 10-minute signed link the app opens in the system browser.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
  if (user.role !== 'SELLER' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS_HEADERS });

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: 'Label signing unavailable' },
      { status: 500, headers: CORS_HEADERS }
    );

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  if (!seller)
    return NextResponse.json(
      { error: 'Seller profile not found' },
      { status: 404, headers: CORS_HEADERS }
    );

  const { id } = await ctx.params;
  const owns = await prisma.orderItem.findFirst({
    where: { orderId: id, variant: { product: { sellerId: seller.id } } },
    select: { id: true },
  });
  if (!owns)
    return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: CORS_HEADERS });

  const exp = Math.floor(Date.now() / 1000) + LABEL_TTL_SECONDS;
  const url = new URL(`/api/seller/orders/${encodeURIComponent(id)}/label`, req.nextUrl.origin);
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('sig', signLabel(id, seller.id, exp, secret));
  return NextResponse.json({ url: url.toString() }, { headers: CORS_HEADERS });
}

// GET ?exp&sig → printable A6 label. No cookie/Bearer: the HMAC is the credential.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const secret = process.env.NEXTAUTH_SECRET;
  const { id } = await ctx.params;
  const exp = Number(req.nextUrl.searchParams.get('exp'));
  const sig = req.nextUrl.searchParams.get('sig') || '';
  const denied = () => new NextResponse('Link expired or invalid', { status: 403 });
  if (!secret || !sig) return denied();

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      paymentMethod: true,
      totalAmount: true,
      shippingAddressSnapshot: true,
      user: { select: { name: true, phone: true } },
      items: {
        select: {
          quantity: true,
          status: true,
          productTitleSnapshot: true,
          selectedSize: true,
          selectedColor: true,
          variant: { select: { product: { select: { title: true, sellerId: true } } } },
        },
      },
    },
  });
  if (!order) return denied();

  // The URL carries no seller id: try each seller on the order against the signature.
  const sellerIds = [...new Set(order.items.map(i => i.variant.product.sellerId))];
  const sellerId = sellerIds.find(s => verifyLabel(order.id, s, exp, sig, secret));
  if (!sellerId) return denied();

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { storeName: true, pickupPhone: true, user: { select: { phone: true } } },
  });

  let addr: Record<string, string | undefined> = {};
  try {
    addr = JSON.parse(order.shippingAddressSnapshot || '{}');
  } catch {}

  const lines = order.items
    .filter(i => i.variant.product.sellerId === sellerId && i.status !== 'CANCELLED')
    .map(i => {
      const opts = [i.selectedColor, i.selectedSize].filter(Boolean).join(' / ');
      return `<tr><td>${esc(i.quantity)}×</td><td>${esc(i.productTitleSnapshot || i.variant.product.title)}${opts ? ` <small>(${esc(opts)})</small>` : ''}</td></tr>`;
    })
    .join('');

  // ponytail: COD shows the whole order total; multi-seller COD orders need a per-seller split.
  const collect =
    order.paymentMethod === 'CASH_ON_DELIVERY'
      ? `COLLECT ${esc(order.totalAmount.toFixed(2))} EGP`
      : 'PREPAID';

  const address = [
    addr.street,
    addr.city,
    addr.governorate || addr.state,
    addr.postalCode || addr.zipCode,
    addr.country,
  ]
    .filter(Boolean)
    .join(', ');
  // The proxy CSP forbids inline handlers; it forwards its per-request nonce as x-nonce.
  const nonce = req.headers.get('x-nonce') || '';
  const date = order.createdAt.toLocaleString('en-GB', { timeZone: 'Africa/Cairo' });

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Label #${esc(orderNumber(order.id))}</title>
<style>@page{size:A6;margin:6mm}*{box-sizing:border-box}body{font:12px/1.35 Arial,sans-serif;margin:0;color:#000}
h1{font-size:20px;margin:0}.box{border:1.5px solid #000;padding:6px;margin-bottom:6px}.lbl{font-size:10px;text-transform:uppercase;color:#444}
.big{font-size:15px;font-weight:bold}.cod{font-size:18px;font-weight:bold;text-align:center;border:2px solid #000;padding:6px}table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:1px 2px}</style></head>
<body>
<div class="box"><h1>#${esc(orderNumber(order.id))}</h1><div>${esc(date)}</div></div>
<div class="box"><div class="lbl">From</div><div class="big">${esc(seller?.storeName)}</div><div>${esc(seller?.pickupPhone || seller?.user.phone)}</div></div>
<div class="box"><div class="lbl">Ship to</div><div class="big">${esc(addr.fullName || addr.name || order.user?.name)}</div><div>${esc(address)}</div><div>${esc(addr.phone || order.user?.phone)}</div></div>
<div class="box"><table>${lines}</table></div>
<div class="cod">${collect}</div>
<script nonce="${esc(nonce)}">window.onload=function(){window.print()}</script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' },
  });
}
