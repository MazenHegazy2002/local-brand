import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const multiBrandToggleSchema = z.object({
  sellerId: z.string().optional(),
  userId: z.string().optional(),
  isMultiBrand: z.boolean(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as SessionUser;
  if (user.role !== 'ADMIN') return null;
  return user;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = multiBrandToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sellerId, userId, isMultiBrand } = parsed.data;
  if (!sellerId && !userId) {
    return NextResponse.json(
      { message: 'Must provide either sellerId or userId' },
      { status: 400 }
    );
  }

  const seller = await prisma.sellerProfile.findFirst({
    where: sellerId ? { id: sellerId } : { userId: userId! },
    include: { brands: true, user: { select: { id: true, name: true, email: true } } },
  });

  if (!seller) {
    return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
  }

  const updatedSeller = await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: { isMultiBrand },
    include: { brands: true, user: { select: { id: true, name: true, email: true } } },
  });

  // If upgraded to multi-brand and seller has no Brands created yet, auto-create initial Brand
  if (isMultiBrand && seller.brands.length === 0) {
    const baseSlug =
      seller.storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'brand';
    let slug = baseSlug;
    let count = 1;
    while (await prisma.brand.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const defaultBrand = await prisma.brand.create({
      data: {
        sellerId: seller.id,
        name: seller.storeName,
        slug,
        description: seller.description || `${seller.storeName} official brand`,
        logoUrl: seller.logoUrl,
        accentColor: '#0f6b50',
        status: 'ACTIVE',
      },
    });

    // Retroactively associate seller's existing unassigned products to this default brand
    await prisma.product.updateMany({
      where: { sellerId: seller.id, brandId: null },
      data: { brandId: defaultBrand.id, brand: defaultBrand.name },
    });
  }

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: isMultiBrand ? 'UPGRADED_SELLER_MULTI_BRAND' : 'DOWNGRADED_SELLER_SINGLE_BRAND',
      targetId: seller.id,
      details: JSON.stringify({
        sellerId: seller.id,
        sellerName: seller.storeName,
        userEmail: seller.user.email,
        isMultiBrand,
      }),
    },
  });

  return NextResponse.json({
    success: true,
    isMultiBrand,
    seller: updatedSeller,
    message: isMultiBrand
      ? `Successfully upgraded ${seller.storeName} to Multi-Brand.`
      : `Successfully set ${seller.storeName} to Single-Brand.`,
  });
}
