import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { OrderItemStatus } from '@/generated/client';

// Session-free cores shared by the web server actions (src/app/actions/seller.ts)
// and the mobile Bearer API routes (src/app/api/seller/**). Callers resolve
// and authorize the user; these functions enforce ownership + business rules.

export async function updateOrderItemStatusCore(
  user: { id: string; role: string },
  itemId: string,
  status: OrderItemStatus
): Promise<{ success?: true; error?: string }> {
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') return { error: 'Forbidden' };

  if (user.role === 'SELLER') {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    if (!sellerProfile) return { error: 'Seller profile not found' };

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { variant: { include: { product: true } } },
    });
    if (!item || item.variant.product.sellerId !== sellerProfile.id) {
      return { error: 'Forbidden: You do not own this order item' };
    }
  }

  const updatedItem = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status },
    include: { order: { include: { items: true } } },
  });

  const parentOrder = updatedItem.order;
  // Only check transitions if the order is still "live"
  if (parentOrder.status !== 'CANCELLED' && parentOrder.status !== 'RETURNED') {
    // When seller marks all items as CONFIRMED (packed/ready), move order to PROCESSING.
    // We ignore items that are already cancelled; they no longer block the transition.
    const liveItems = parentOrder.items.filter(i => i.status !== 'CANCELLED');
    const allPrepared = liveItems.every(i =>
      ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(i.status)
    );

    if (
      allPrepared &&
      liveItems.length > 0 &&
      (parentOrder.status === 'PENDING_PAYMENT' || parentOrder.status === 'CONFIRMED')
    ) {
      await prisma.order.update({
        where: { id: parentOrder.id },
        data: { status: 'PROCESSING' },
      });
    }
  }

  revalidatePath('/seller-hub');
  revalidatePath('/dashboard');
  revalidatePath('/admin-os');
  return { success: true };
}

export interface ProductData {
  title: string;
  titleAr?: string;
  description?: string;
  basePrice: number;
  weightKg: number;
  categoryId: string;
  brandId?: string;
  brand?: string;
  flashSalePrice?: number;
  flashSaleEndsAt?: string;
  published?: boolean;
  mainImage?: string;
  mainImageUploading?: boolean;
  /** Extra gallery images, saved as non-primary ProductImage rows. */
  extraImages?: string[];
  variants?: {
    color?: string;
    price?: number;
    stock?: number;
    image?: string;
    sku?: string;
    upc?: string;
    sizes?: string | string[];
  }[];
}

// Allocate a SKU for a brand-new variant. Sellers can pass one in; if they
// don't, we build a slug-based candidate and add a -2/-3/... suffix until
// we find one that's actually free in the DB. This avoids the previous
// `Date.now().slice(-4)` collisions and gives a more readable code.
async function resolveSku(
  preferred: string | undefined,
  productSlug: string,
  variantHint: string,
  index: number
): Promise<string> {
  const sanitize = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  if (preferred && preferred.trim()) {
    const trimmed = preferred.trim().toUpperCase();
    const existing = await prisma.productVariant.findUnique({ where: { sku: trimmed } });
    if (!existing) return trimmed;
    // Seller picked something already taken — append a numeric suffix
    // rather than failing the entire create. Most sellers prefer a
    // working product over a duplicate-SKU error.
    let counter = 2;
    while (counter < 1000) {
      const candidate = `${trimmed}-${counter}`;
      const taken = await prisma.productVariant.findUnique({ where: { sku: candidate } });
      if (!taken) return candidate;
      counter++;
    }
  }

  const base = `${sanitize(productSlug)}-${sanitize(variantHint || 'STD')}`;
  let candidate = `${base}-${index + 1}`;
  let counter = 1;
  while (counter < 1000) {
    const taken = await prisma.productVariant.findUnique({ where: { sku: candidate } });
    if (!taken) return candidate;
    counter++;
    candidate = `${base}-${index + 1}-${counter}`;
  }
  // Fallback — extremely unlikely. Tag with a timestamp so it's still
  // readable but guaranteed unique.
  return `${base}-${index + 1}-${Date.now().toString().slice(-6)}`;
}

export async function createProductForSeller(
  userId: string,
  data: ProductData
): Promise<{ id?: string; published?: boolean; publishBlockedReason?: string; error?: string }> {
  const [user, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    prisma.sellerProfile.findUnique({ where: { userId } }),
  ]);

  if (!seller) return { error: 'Seller profile not found' };

  // ── Input validation ──────────────────────────────────────────────────────
  // B-023: enforce minimum content quality for product listings.
  if (!data.title || data.title.trim().length < 3)
    return { error: 'Product title must be at least 3 characters.' };
  if (data.title.trim().length > 200)
    return { error: 'Product title cannot exceed 200 characters.' };
  if (data.description !== undefined && data.description !== null) {
    const descLen = data.description.trim().length;
    if (descLen > 0 && descLen < 20)
      return {
        error:
          'Product description must be at least 20 characters (aim for 100–300 words for better sales).',
      };
  }
  if (!data.basePrice || data.basePrice <= 0)
    return { error: 'Product price must be greater than zero.' };
  if (!data.weightKg || Number(data.weightKg) <= 0)
    return { error: 'Product weight (in KG) is required and must be greater than zero.' };

  const weightGrams = Math.round(Number(data.weightKg) * 1000);
  const {
    variants,
    weightKg: _weightKg,
    mainImage: _mainImage,
    mainImageUploading: _mainImageUploading,
    extraImages = [],
    ...rest
  } = data;

  // Enforce business rules for publishing:
  // 1. Must have at least one product image.
  // 2. The seller's email must be verified.
  // 3. The SellerProfile.status must be ACTIVE.
  const hasImages = data.mainImage || extraImages.length > 0 || (variants || []).some(v => v.image);
  const publishBlockedReason = !hasImages
    ? 'Add at least one image before publishing this product.'
    : !user?.emailVerified
      ? 'Verify your email address before publishing products.'
      : seller.status !== 'ACTIVE'
        ? 'Your seller account is not active yet. Products can only go live after admin approval.'
        : undefined;

  let published = rest.published ?? true;
  if (published && publishBlockedReason) published = false;

  // Generate unique slug
  const rawSlug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const baseSlug = rawSlug || `product-${Date.now().toString(36)}`;
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  // Pre-allocate SKUs in order so we can include them in the nested
  // `create` payload below. This keeps the whole product+variants
  // creation in a single Prisma call.
  const variantList = variants || [];
  const resolvedSkus = await Promise.all(
    variantList.map((v, idx) => resolveSku(v.sku, slug, v.color || 'std', idx))
  );

  let brandName = data.brand || null;
  if (data.brandId) {
    const b = await prisma.brand.findUnique({ where: { id: data.brandId } });
    if (b) {
      if (b.status === 'PENDING_APPROVAL') {
        return {
          error: `Brand "${b.name}" is pending admin approval and cannot be used for products yet.`,
        };
      }
      brandName = b.name;
    }
  }

  const product = await prisma.product.create({
    data: {
      ...rest,
      brandId: data.brandId || null,
      brand: brandName,
      weightGrams,
      published,
      sellerId: seller.id,
      slug,
      description: rest.description || '',
      variants: {
        create: variantList.map((v, idx) => {
          const sizesArray =
            typeof v.sizes === 'string'
              ? v.sizes
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : Array.isArray(v.sizes)
                ? v.sizes
                : [];
          return {
            sku: resolvedSkus[idx],
            upc: v.upc?.trim() || null,
            title: v.color || 'Standard',
            attributes: JSON.stringify({
              color: v.color || 'Standard',
              sizes: sizesArray,
            }),
            price: v.price || rest.basePrice,
            stockCount: v.stock || 0,
          };
        }),
      },
      images: {
        create: [
          // Main product image (if provided) is always primary
          ...(data.mainImage ? [{ url: data.mainImage, isPrimary: true }] : []),
          // Variant images follow — isPrimary only if no main image was set
          ...variantList
            .filter(v => v.image)
            .map((v, idx) => ({
              url: v.image!,
              isPrimary: !data.mainImage && idx === 0,
            })),
          ...extraImages.map(url => ({ url, isPrimary: false })),
        ],
      },
    },
  });

  revalidatePath('/seller-hub');
  revalidatePath('/');
  revalidatePath('/shop');
  return {
    id: product.id,
    published,
    ...(rest.published !== false && !published ? { publishBlockedReason } : {}),
  };
}

export async function toggleProductPublishedForSeller(
  userId: string,
  productId: string,
  publish: boolean
): Promise<{ success?: true; published?: boolean; error?: string }> {
  const [user, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, phone: true } }),
    prisma.sellerProfile.findUnique({ where: { userId } }),
  ]);
  if (!seller) return { error: 'Seller profile not found' };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: { take: 1 } },
  });
  if (!product || product.sellerId !== seller.id) {
    return { error: 'Unauthorized to update this product' };
  }

  if (publish) {
    if (product.images.length === 0) {
      return { error: 'Add at least one image before publishing this product.' };
    }
    if (!user?.emailVerified) {
      return {
        error:
          'Verify your email address before publishing products. Check your inbox for the verification link.',
      };
    }
    if (seller.status !== 'ACTIVE') {
      return {
        error:
          'Your seller account is not active yet. Products can only go live after admin approval.',
      };
    }
    const hasPickupAddress =
      Boolean(seller.governorate?.trim()) &&
      Boolean(seller.city?.trim()) &&
      Boolean(seller.pickupStreet?.trim()) &&
      Boolean((seller.pickupPhone || user?.phone)?.trim());
    if (!hasPickupAddress) {
      return {
        error:
          'Please complete your product pickup warehouse address (governorate, city, street address, and phone) in Seller Hub Settings before publishing products.',
      };
    }
  }

  await prisma.product.update({ where: { id: productId }, data: { published: publish } });

  const { invalidateCache } = await import('@/lib/cache');
  await invalidateCache('products:*');
  await invalidateCache('product:detail:*');

  revalidatePath('/seller-hub');
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath(`/product/${productId}`);
  return { success: true, published: publish };
}
