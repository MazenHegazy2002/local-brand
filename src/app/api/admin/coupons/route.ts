import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCouponSchema } from '@/lib/validation';
import { SessionUser } from '@/types';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const coupons = await prisma.coupon.findMany();

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
    return NextResponse.json({ message: 'Invalid data', errors: validated.error.format() }, { status: 400 });
  }

  const data = validated.data;

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code,
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