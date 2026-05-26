import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/types';

// Helper to resolve unique SKU for new variants during edit
async function resolveSku(
  providedSku: string | undefined,
  productSlug: string,
  color: string,
  index: number
): Promise<string> {
  if (providedSku?.trim()) {
    return providedSku.trim().toUpperCase();
  }
  const cleanColor = color.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const prefix = `${productSlug.slice(0, 15)}-${cleanColor.slice(0, 5)}`;
  let suffix = index;
  while (true) {
    const sku = `${prefix}-${suffix}`.toUpperCase();
    const existing = await prisma.productVariant.findUnique({ where: { sku } });
    if (!existing) return sku;
    suffix++;
  }
}

// GET /api/products/[id] — Retrieve a single product by ID (unprotected or seller/admin access)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        images: true,
        variants: true,
        category: true,
        tags: true,
      },
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error('[products/[id]] GET error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/products/[id] — Update product and its variants safely
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Authorization: Only the seller owner or an ADMIN can edit
    if (user.role !== 'ADMIN') {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!sellerProfile || product.sellerId !== sellerProfile.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();
    const {
      title,
      description,
      basePrice,
      categoryId,
      condition,
      weightGrams,
      flashSalePrice,
      flashSaleEndsAt,
      flashSaleLimit,
      loyaltyPointPct,
      published,
      variants,
    } = body;

    // 1. Update basic product information
    await prisma.product.update({
      where: { id },
      data: {
        title,
        description,
        basePrice: Number(basePrice),
        categoryId,
        condition: condition || 'NEW',
        weightGrams: weightGrams ? Number(weightGrams) : null,
        flashSalePrice: flashSalePrice ? Number(flashSalePrice) : null,
        flashSaleEndsAt: flashSaleEndsAt ? new Date(flashSaleEndsAt) : null,
        flashSaleLimit: flashSaleLimit ? Number(flashSaleLimit) : null,
        loyaltyPointPct: loyaltyPointPct != null ? Number(loyaltyPointPct) : null,
        published: published ?? true,
      },
    });

    // 2. Safe selective variants update
    if (variants && Array.isArray(variants)) {
      const dbVariants = await prisma.productVariant.findMany({
        where: { productId: id },
      });

      // Find variants to delete
      const incomingIds = variants.map(v => v.id).filter(Boolean);
      const toDelete = dbVariants.filter(v => !incomingIds.includes(v.id));

      if (toDelete.length > 0) {
        await prisma.productVariant.deleteMany({
          where: { id: { in: toDelete.map(v => v.id) } },
        });
      }

      // Create or update incoming variants
      let idx = 0;
      for (const v of variants) {
        const colorVal = v.color || v.title || 'Standard';
        const sizesArray =
          typeof v.sizes === 'string'
            ? v.sizes
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : Array.isArray(v.sizes)
              ? v.sizes
              : [];

        const attributesStr = JSON.stringify({
          color: colorVal,
          sizes: sizesArray,
        });

        if (v.id) {
          // Update existing variant
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              title: colorVal,
              sku: v.sku?.trim() || dbVariants.find(dbv => dbv.id === v.id)?.sku || `SKU-${v.id}`,
              upc: v.upc?.trim() || null,
              stockCount: Number(v.stockCount ?? v.stock ?? 0),
              price: Number(v.price || basePrice),
              attributes: attributesStr,
            },
          });
        } else {
          // Create new variant
          const skuVal = await resolveSku(v.sku, product.slug, colorVal, idx);
          await prisma.productVariant.create({
            data: {
              productId: id,
              title: colorVal,
              sku: skuVal,
              upc: v.upc?.trim() || null,
              stockCount: Number(v.stockCount ?? v.stock ?? 0),
              price: Number(v.price || basePrice),
              attributes: attributesStr,
            },
          });
        }
        idx++;
      }

      // 3. Synchronize variant images to ProductImage table if present
      const uniqueImages = Array.from(new Set(variants.map(v => v.image).filter(Boolean)));
      if (uniqueImages.length > 0) {
        await prisma.productImage.deleteMany({
          where: { productId: id },
        });
        await prisma.productImage.createMany({
          data: uniqueImages.map((url, idx) => ({
            productId: id,
            url,
            isPrimary: idx === 0,
          })),
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[products/[id]] PUT error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/products/[id] — Delete product cleanly
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Authorization: Only the seller owner or an ADMIN can delete
    if (user.role !== 'ADMIN') {
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!sellerProfile || product.sellerId !== sellerProfile.id) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    // Perform soft or hard delete depending on platform standard (let's do soft delete if deletedAt exists, or cascade hard delete safely)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[products/[id]] DELETE error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
