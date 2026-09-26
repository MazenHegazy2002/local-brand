import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(80),
  nameAr: z.string().max(80).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().or(z.literal('')).nullable(),
  coverUrl: z.string().url().optional().or(z.literal('')).nullable(),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .default('#0f6b50'),
  status: z.enum(['ACTIVE', 'DRAFT']).optional().default('ACTIVE'),
});

async function getSellerProfile(userId: string) {
  return prisma.sellerProfile.findUnique({
    where: { userId },
    include: { brands: true },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const seller = await getSellerProfile(user.id);
  if (!seller) {
    return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
  }

  const brands = await prisma.brand.findMany({
    where: { sellerId: seller.id },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    isMultiBrand: seller.isMultiBrand,
    brands,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only sellers can create brands' }, { status: 403 });
  }

  const seller = await getSellerProfile(user.id);
  if (!seller) {
    return NextResponse.json({ message: 'Seller profile not found' }, { status: 404 });
  }

  if (!seller.isMultiBrand && seller.brands.length >= 1) {
    return NextResponse.json(
      {
        message:
          'Multi-brand feature is not enabled for your account. Please contact an admin to upgrade your account.',
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Validation error', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, nameAr, description, logoUrl, coverUrl, accentColor, status } = parsed.data;

  // Generate unique slug
  const baseSlug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'brand';
  let slug = baseSlug;
  let count = 1;
  while (await prisma.brand.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${count++}`;
  }

  const newBrand = await prisma.brand.create({
    data: {
      sellerId: seller.id,
      name,
      nameAr: nameAr || null,
      slug,
      description: description || null,
      logoUrl: logoUrl || null,
      coverUrl: coverUrl || null,
      accentColor: accentColor || '#0f6b50',
      status: status || 'ACTIVE',
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({
    success: true,
    brand: newBrand,
  });
}
