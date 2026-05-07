import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const coupons = await prisma.coupon.findMany();

  return NextResponse.json({ coupons });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role: string }).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: parseFloat(data.discountValue),
      minOrderValue: data.minOrderValue ? parseFloat(data.minOrderValue) : null,
      maxDiscount: data.maxDiscount ? parseFloat(data.maxDiscount) : null,
      usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
      expiryDate: new Date(data.expiryDate),
      isActive: true,
    },
  });

  return NextResponse.json({ coupon });
}