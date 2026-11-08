import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { getRequestUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { BCRYPT_COST } from '@/lib/constants';
import { createOrderForUser, MANUAL_EMAIL_DOMAIN } from '@/lib/order-creator';

// Orders taken outside the website (WhatsApp, Instagram, phone…), entered by
// an admin or co-admin. They go through the normal order flow, so stock,
// seller alerts, commissions and escrow all work as for a website order.

const isStaff = (role?: string) => role === 'ADMIN' || role === 'CO_ADMIN';

const SOURCES = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'IN_PERSON', 'OTHER'] as const;

const schema = z.object({
  source: z.enum(SOURCES),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(8).max(20),
    email: z.string().trim().email().optional().or(z.literal('')),
  }),
  address: z.object({
    street: z.string().trim().min(2).max(300),
    city: z.string().trim().min(2).max(120),
    governorate: z.string().trim().min(2).max(120),
  }),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
        selectedSize: z.string().max(50).optional(),
        selectedColor: z.string().max(50).optional(),
      })
    )
    .min(1)
    .max(50),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'INSTAPAY', 'VODAFONE_CASH']),
  paid: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

const digits = (p: string) => p.replace(/[^\d]/g, '');

// GET ?q= — product search for the order form (published products only).
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!isStaff(user?.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') ?? '').trim();
  const phone = digits(sp.get('phone') ?? '');

  if (phone.length >= 8) {
    const found = await prisma.user.findFirst({
      where: { role: 'BUYER', phone: { contains: phone.slice(-10) } },
      select: { name: true, email: true, phone: true },
    });
    return NextResponse.json({
      customer: found
        ? { ...found, email: found.email.endsWith(MANUAL_EMAIL_DOMAIN) ? '' : found.email }
        : null,
    });
  }

  const products = await prisma.product.findMany({
    where: {
      published: true,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { seller: { storeName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      basePrice: true,
      flashSalePrice: true,
      seller: { select: { storeName: true } },
      images: { select: { url: true }, orderBy: { isPrimary: 'desc' }, take: 1 },
      variants: {
        select: { id: true, title: true, price: true, stockCount: true, attributes: true },
      },
    },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const staff = await getRequestUser(req);
  if (!staff || !isStaff(staff.role))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Please check the order details.' },
      { status: 400 }
    );
  const { source, customer, address, items, paymentMethod, paid, notes } = parsed.data;
  const phone = digits(customer.phone);
  const email = customer.email?.toLowerCase() || '';

  // Find the customer by email or phone, or add them as a buyer.
  let buyer = await prisma.user.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), { phone: { contains: phone.slice(-10) } }],
    },
    select: { id: true, role: true },
  });
  if (buyer && buyer.role !== 'BUYER')
    return NextResponse.json(
      { error: 'That phone or email belongs to a seller or staff account. Use another one.' },
      { status: 400 }
    );
  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        name: customer.name,
        phone,
        email: email || `wa-${phone}-${randomBytes(3).toString('hex')}${MANUAL_EMAIL_DOMAIN}`,
        // No usable password: the customer can set one later with "forgot password".
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), BCRYPT_COST),
        role: 'BUYER',
      },
      select: { id: true, role: true },
    });
  }

  const result = await createOrderForUser(
    buyer.id,
    {
      items,
      paymentMethod,
      shippingAddress: { fullName: customer.name, phone, ...address, country: 'Egypt' },
      orderNotes: notes || undefined,
    },
    null,
    { manual: { source, createdById: staff.id } }
  );
  if (!result.success || !result.orderId)
    return NextResponse.json(
      { error: result.error || 'Could not create the order.' },
      { status: 400 }
    );

  if (paid) {
    await prisma.order.update({
      where: { id: result.orderId },
      data: { paymentStatus: 'PAID' },
    });
  }
  await prisma.auditLog
    .create({
      data: {
        adminId: staff.id,
        action: 'MANUAL_ORDER_CREATED',
        targetId: result.orderId,
        details: JSON.stringify({ source, paymentMethod, paid: !!paid }),
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, orderId: result.orderId });
}
