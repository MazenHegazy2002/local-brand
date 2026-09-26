import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(80).optional(),
  nameAr: z.string().max(80).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().or(z.literal('')).nullable(),
  coverUrl: z.string().url().optional().or(z.literal('')).nullable(),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  status: z.enum(['ACTIVE', 'DRAFT']).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const { id } = await params;

  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { seller: true },
  });

  if (!brand) {
    return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
  }

  if (brand.seller.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden. You do not own this brand' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Validation error', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const dataToUpdate: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.name && parsed.data.name !== brand.name) {
    const baseSlug = parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let count = 1;
    while (await prisma.brand.findFirst({ where: { slug, NOT: { id } } })) {
      slug = `${baseSlug}-${count++}`;
    }
    dataToUpdate.slug = slug;
  }

  const updated = await prisma.brand.update({
    where: { id },
    data: dataToUpdate,
    include: { _count: { select: { products: true } } },
  });

  // If brand name changed, sync product.brand text field for associated products
  if (parsed.data.name) {
    await prisma.product.updateMany({
      where: { brandId: id },
      data: { brand: parsed.data.name },
    });
  }

  return NextResponse.json({
    success: true,
    brand: updated,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const { id } = await params;

  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { seller: true },
  });

  if (!brand) {
    return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
  }

  if (brand.seller.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // Unlink products before deleting brand
  await prisma.product.updateMany({
    where: { brandId: id },
    data: { brandId: null },
  });

  await prisma.brand.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
    message: 'Brand deleted successfully',
  });
}
