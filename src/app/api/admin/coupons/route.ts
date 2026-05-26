import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCouponSchema } from '@/lib/validation';
import { SessionUser } from '@/types';

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const coupons = await prisma.coupon.findMany({
    include: {
      usages: {
        include: {
          user: { select: { name: true, email: true } },
          order: { select: { id: true, totalAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const validated = createCouponSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { message: 'Invalid data', errors: validated.error.format() },
      { status: 400 }
    );
  }

  const data = validated.data;

  // Coupon codes are matched case-insensitively at evaluation
  // (`/api/coupons/evaluate` normalises with toUpperCase()), so we store
  // them upper-cased on insert too. Otherwise a coupon stored as "summer10"
  // would be unreachable from the evaluation endpoint.
  const coupon = await prisma.coupon.create({
    data: {
      code: data.code.trim().toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue ?? null,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? null,
      expiryDate: new Date(data.expiryDate),
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ coupon });
}
