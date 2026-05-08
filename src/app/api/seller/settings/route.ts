import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const settingsSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  city: z.string().max(80).optional(),
  governorate: z.string().max(80).optional(),
  bankAccount: z.string().max(200).optional(),
});

// GET /api/seller/settings — fetch current seller's store settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    if (role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        storeName: true,
        description: true,
        logoUrl: true,
        city: true,
        governorate: true,
        bankAccount: true,
        commissionRate: true,
        status: true,
        balance: true,
      },
    });

    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    return NextResponse.json({ seller });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[seller/settings] GET error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/seller/settings — update store settings
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    if (role !== 'SELLER') {
      return NextResponse.json({ message: 'Seller account required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid settings payload', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) {
      return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
    }

    // Remove empty logo string so we don't overwrite with '' unintentionally.
    const data = { ...parsed.data };
    if (data.logoUrl === '') delete data.logoUrl;

    const updated = await prisma.sellerProfile.update({
      where: { id: seller.id },
      data,
      select: {
        id: true,
        storeName: true,
        description: true,
        logoUrl: true,
        city: true,
        governorate: true,
        bankAccount: true,
        commissionRate: true,
        status: true,
        balance: true,
      },
    });

    return NextResponse.json({ success: true, seller: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[seller/settings] PATCH error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
