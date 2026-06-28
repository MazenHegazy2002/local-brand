'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OrderStatus, SellerStatus, OrderItemStatus, Role } from '@/generated/client';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/constants';

import type { Session } from 'next-auth';
import type { Review, SessionUser } from '@/types';

async function getRealUserId(session: Session | null) {
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  return userId;
}

export async function getDashboardStats() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'Unauthorized' };
    const role = (session.user as SessionUser).role;

    if (role === 'BUYER') {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: { include: { variant: { include: { product: { include: { images: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const wishlist = await prisma.wishlist.findMany({
        where: { userId },
        include: { product: { include: { images: true } } },
      });

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const affiliate = await prisma.affiliate.findUnique({
        where: { userId },
      });

      return JSON.parse(
        JSON.stringify({
          myOrders: orders,
          wishlist,
          notifications,
          isAffiliate: !!affiliate,
          stats: {
            totalOrders: orders.length,
            wishlistCount: wishlist.length,
          },
        })
      );
    }

    if (role === 'SELLER') {
      const seller = await prisma.sellerProfile.findUnique({
        where: { userId },
        include: {
          products: {
            include: {
              images: true,
              variants: true,
              category: true,
              tags: true,
              collections: true,
            },
          },
        },
      });

      if (!seller)
        return {
          error: 'Seller profile not found. Please contact support or complete your registration.',
        };

      const orders = await prisma.order.findMany({
        where: {
          items: { some: { variant: { productId: { in: seller.products.map(p => p.id) } } } },
        },
        include: {
          items: { include: { variant: true } },
          // Include the buyer so the seller hub can surface their name/email
          // for logged-in customers; guests rely on Order.guestEmail directly.
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Real Daily Revenue Aggregation (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const productIds = seller.products.map(p => p.id);

      const dailyStats = await prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: sevenDaysAgo },
          items: { some: { variant: { productId: { in: productIds } } } },
        },
        _sum: { totalAmount: true },
      });

      // Map to 7-day array
      const dailyRevenue = new Array(7).fill(0);
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().split('T')[0];

        const match = dailyStats.find(s => s.createdAt.toISOString().split('T')[0] === dayStr);
        dailyRevenue[i] = match?._sum?.totalAmount || 0;
      }

      // Real rating + review aggregation
      const reviewAgg = productIds.length
        ? await prisma.review.aggregate({
            where: { productId: { in: productIds }, rating: { gt: 0 } },
            _avg: { rating: true },
            _count: { _all: true },
          })
        : { _avg: { rating: 0 }, _count: { _all: 0 } };

      // Today's orders count
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayOrdersCount = productIds.length
        ? await prisma.order.count({
            where: {
              createdAt: { gte: startOfToday },
              items: { some: { variant: { productId: { in: productIds } } } },
            },
          })
        : 0;

      // Month-over-month revenue change
      const startOfThisMonth = new Date();
      startOfThisMonth.setDate(1);
      startOfThisMonth.setHours(0, 0, 0, 0);
      const startOfPrevMonth = new Date(startOfThisMonth);
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
      const endOfPrevMonth = new Date(startOfThisMonth);
      endOfPrevMonth.setMilliseconds(-1);

      const [thisMonthAgg, prevMonthAgg] = productIds.length
        ? await Promise.all([
            prisma.order.aggregate({
              where: {
                createdAt: { gte: startOfThisMonth },
                items: { some: { variant: { productId: { in: productIds } } } },
              },
              _sum: { totalAmount: true },
            }),
            prisma.order.aggregate({
              where: {
                createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                items: { some: { variant: { productId: { in: productIds } } } },
              },
              _sum: { totalAmount: true },
            }),
          ])
        : [{ _sum: { totalAmount: 0 } }, { _sum: { totalAmount: 0 } }];

      const thisMonthRevenue = thisMonthAgg._sum.totalAmount || 0;
      const prevMonthRevenue = prevMonthAgg._sum.totalAmount || 0;
      const monthlyChangePct =
        prevMonthRevenue > 0
          ? Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
          : thisMonthRevenue > 0
            ? 100
            : 0;

      // --- Performance Metrics Calculation ---
      const totalSellerOrders = orders.length;
      const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
      const returnedOrders = orders.filter(o => o.status === 'RETURNED').length;

      const orderAcceptance =
        totalSellerOrders > 0
          ? Math.round(((totalSellerOrders - cancelledOrders) / totalSellerOrders) * 100)
          : 100;

      const returnRate =
        totalSellerOrders > 0 ? Math.round((returnedOrders / totalSellerOrders) * 100) : 0;

      // Shipping Speed (Mocked for now as we don't have shippedAt in Order easily without Shipment join)
      const shippingSpeed = 95;

      // Earnings come from the dedicated computeSellerEarnings helper — the
      // legacy seller.balance column is no longer trusted (it drifted as
      // status flipped, admin overrides happened, and there was no escrow).
      const { computeSellerEarnings } = await import('@/lib/seller-earnings');
      const earnings = await computeSellerEarnings(seller.id);

      const stats = {
        totalProducts: seller.products.length,
        totalOrders: orders.length,
        balance: earnings.available,
        heldBalance: earnings.held,
        nextReleaseAt: earnings.nextReleaseAt ? earnings.nextReleaseAt.toISOString() : null,
        revenue: orders.reduce((acc, o) => acc + o.totalAmount, 0),
        dailyRevenue,
        avgRating: reviewAgg._avg.rating ? Number(reviewAgg._avg.rating.toFixed(1)) : 0,
        reviewCount: reviewAgg._count._all,
        todayOrdersCount,
        thisMonthRevenue,
        monthlyChangePct,
        performance: {
          orderAcceptance,
          returnRate,
          shippingSpeed,
        },
      };

      return JSON.parse(
        JSON.stringify({
          currentSeller: seller,
          myProducts: seller.products,
          myOrders: orders,
          stats,
          categories: await prisma.category.findMany(),
          tags: await prisma.tag.findMany(),
          collections: await prisma.collection.findMany(),
        })
      );
    }

    if (role === 'ADMIN') {
      const sellers = await prisma.sellerProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              phone: true,
              emailVerified: true,
              createdAt: true,
            },
          },
          products: { select: { id: true, title: true, published: true } },
          payouts: { orderBy: { createdAt: 'desc' } },
        },
      });
      // Recompute each seller's available balance on the fly so the admin
      // sellers tab matches what the seller sees in their own hub. The old
      // sellerProfile.balance column is no longer authoritative.
      const { computeSellerEarnings } = await import('@/lib/seller-earnings');
      const sellerEarnings = await Promise.all(
        sellers.map(s => computeSellerEarnings(s.id).then(e => [s.id, e] as const))
      );
      const earningsById = new Map(sellerEarnings);
      for (const s of sellers) {
        const e = earningsById.get(s.id);
        if (e) {
          s.balance = e.available;
          // Expose escrow fields for the admin deep-view modal
          (s as typeof s & { heldBalance: number; nextReleaseAt: string | null }).heldBalance =
            e.held;
          (s as typeof s & { heldBalance: number; nextReleaseAt: string | null }).nextReleaseAt =
            e.nextReleaseAt ? e.nextReleaseAt.toISOString() : null;
        }
      }
      const orders = await prisma.order.findMany({
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      flashSalePrice: true,
                      categoryId: true,
                      category: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      });
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      const products = await prisma.product.findMany({
        include: {
          images: true,
          variants: { select: { id: true, stockCount: true, price: true } },
          category: { select: { id: true, name: true } },
          seller: { select: { id: true, storeName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const auditLogs = await prisma.auditLog.findMany({
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const systemSettings = await prisma.systemSettings.findMany();
      const payouts = await prisma.payout.findMany({
        include: { seller: true },
        orderBy: { createdAt: 'desc' },
      });
      const categories = await prisma.category.findMany({ include: { children: true } });
      const tags = await prisma.tag.findMany();
      const collections = await prisma.collection.findMany();

      const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);
      const totalPlatformFees = orders.reduce((acc, o) => acc + o.platformFee, 0);

      const stats = {
        revenue: totalRevenue,
        platformFees: totalPlatformFees,
        totalOrders: orders.length,
        totalSellers: sellers.length,
        totalUsers: users.length,
        totalProducts: products.length,
      };

      return JSON.parse(
        JSON.stringify({
          sellers,
          orders,
          users,
          products,
          auditLogs,
          systemSettings,
          payouts,
          categories,
          tags,
          collections,
          pendingSellers: sellers.filter(s => s.status === 'PENDING_APPROVAL'),
          stats,
        })
      );
    }

    return { error: 'Invalid role' };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[getDashboardStats] Error:', error);
    // In production we keep the message generic to avoid leaking schema /
    // connection details. In development we surface the underlying message
    // so the developer can fix the root cause without grepping logs.
    const detail =
      process.env.NODE_ENV === 'development' && error?.message ? ` (${error.message})` : '';
    return { error: `Database connection failed or data could not be retrieved.${detail}` };
  }
}

export async function getHomepageData() {
  try {
    const categories = await prisma.category.findMany({
      take: 6,
      where: { parentId: null },
    });

    const { getSetting } = await import('@/lib/admin-settings-registry');
    const bestSellersSlug = await getSetting<string>('HOMEPAGE_BEST_SELLERS_CAT').catch(() => '');
    const newArrivalsSlug = await getSetting<string>('HOMEPAGE_NEW_ARRIVALS_CAT').catch(() => '');
    const recommendedSlug = await getSetting<string>('HOMEPAGE_RECOMMENDED_CAT').catch(() => '');

    let bestsellers: any[] = [];
    if (bestSellersSlug) {
      bestsellers = await prisma.product.findMany({
        where: { published: true, category: { slug: bestSellersSlug }, deletedAt: null },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true } },
          reviews: { select: { rating: true } },
        },
        take: 6,
      });
    }
    if (bestsellers.length === 0) {
      bestsellers = await prisma.product.findMany({
        where: { isFeatured: true, published: true, deletedAt: null },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true } },
          reviews: { select: { rating: true } },
        },
        take: 6,
      });
    }

    let newArrivals: any[] = [];
    if (newArrivalsSlug) {
      newArrivals = await prisma.product.findMany({
        where: { published: true, category: { slug: newArrivalsSlug }, deletedAt: null },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
    }
    if (newArrivals.length === 0) {
      newArrivals = await prisma.product.findMany({
        where: { published: true, deletedAt: null },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
    }

    let recommended: any[] = [];
    if (recommendedSlug) {
      recommended = await prisma.product.findMany({
        where: { published: true, category: { slug: recommendedSlug }, deletedAt: null },
        include: {
          images: true,
          variants: true,
          seller: { select: { storeName: true } },
          reviews: { select: { rating: true } },
        },
        take: 6,
      });
    }
    if (recommended.length === 0) {
      recommended = [...newArrivals, ...bestsellers].slice(0, 6);
    }

    return { categories, bestsellers, newArrivals, recommended };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[getHomepageData] Error:', error);
    return { categories: [], bestsellers: [], newArrivals: [], recommended: [] };
  }
}

export async function updateSellerStatus(sellerId: string, status: SellerStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN')
      return { error: 'Unauthorized' };

    const adminId = await getRealUserId(session);

    await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { status },
    });

    // Log action
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: status === 'ACTIVE' ? 'APPROVED_SELLER' : 'SUSPENDED_SELLER',
          targetId: sellerId,
          details: `Status changed to ${status}`,
        },
      });
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[updateSellerStatus] Error:', error);
    return { error: error.message || 'Failed to update status' };
  }
}

export async function updateSellerCommission(sellerId: string, commissionRate: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN')
      return { error: 'Unauthorized' };

    const rate = Math.min(1, Math.max(0, commissionRate));

    const adminId = await getRealUserId(session);

    await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { commissionRate: rate },
    });

    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'UPDATED_SELLER_COMMISSION',
          targetId: sellerId,
          details: `Commission rate changed to ${Math.round(rate * 100)}%`,
        },
      });
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[updateSellerCommission] Error:', error);
    return { error: error.message || 'Failed to update commission' };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };

    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function updateOrderItemStatus(itemId: string, status: OrderItemStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { order: { include: { items: true } } },
    });

    const parentOrder = updatedItem.order;
    // Only check transitions if the order is still "live"
    if (parentOrder.status !== 'CANCELLED' && parentOrder.status !== 'RETURNED') {
      const allItems = parentOrder.items;

      // When seller marks all items as CONFIRMED (packed/ready), move order to PROCESSING.
      // We ignore items that are already cancelled; they no longer block the transition.
      const liveItems = allItems.filter(i => i.status !== 'CANCELLED');
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
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

interface ProductData {
  title: string;
  description?: string;
  basePrice: number;
  categoryId: string;
  flashSalePrice?: number;
  flashSaleEndsAt?: string;
  published?: boolean;
  variants?: {
    color?: string;
    price?: number;
    stock?: number;
    image?: string;
    sku?: string;
    upc?: string;
    sizes?: string;
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

export async function createProduct(data: ProductData): Promise<{ id?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER')
      return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'User not found' };

    const [user, seller] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      }),
      prisma.sellerProfile.findUnique({ where: { userId } }),
    ]);

    if (!seller) return { error: 'Seller profile not found' };

    const { variants, ...rest } = data;

    // Enforce business rules for publishing:
    // 1. Must have at least one product image.
    // 2. The seller's email must be verified.
    // 3. The SellerProfile.status must be ACTIVE.
    const hasImages = (variants || []).some(v => v.image);
    const isEmailVerified = !!user?.emailVerified;
    const isSellerActive = seller.status === 'ACTIVE';

    let published = rest.published ?? true;
    if (published) {
      if (!hasImages || !isEmailVerified || !isSellerActive) {
        published = false;
      }
    }

    // Generate unique slug
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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

    const product = await prisma.product.create({
      data: {
        ...rest,
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
          create: variantList
            .filter(v => v.image)
            .map((v, idx) => ({
              url: v.image!,
              isPrimary: idx === 0,
            })),
        },
      },
    });

    revalidatePath('/seller-hub');
    return { id: product.id };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[createProduct] Error:', err);
    return { error: error.message || 'Failed to create product' };
  }
}

interface UpdateProductData {
  title?: string;
  description?: string;
  basePrice?: number;
  categoryId?: string;
  published?: boolean;
}

export async function updateProduct(
  productId: string,
  data: UpdateProductData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER')
      return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'User not found' };
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return { error: 'Seller profile not found' };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== seller.id)
      return { error: 'Unauthorized to update this product' };

    await prisma.product.update({
      where: { id: productId },
      data,
    });

    revalidatePath('/seller-hub');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER')
      return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'User not found' };
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return { error: 'Seller profile not found' };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== seller.id)
      return { error: 'Unauthorized to delete this product' };

    await prisma.product.delete({ where: { id: productId } });

    revalidatePath('/seller-hub');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

/**
 * Toggle a product's published status.
 *
 * Business rules:
 *   1. A product must have at least one image before it can be published.
 *      Drafts without images stay drafts, matching the bulk-upload flow.
 *   2. The seller's account must have a verified email and an ACTIVE
 *      SellerProfile status. PENDING_APPROVAL/SUSPENDED/BANNED sellers can
 *      still own draft products but cannot push them public.
 */
export async function toggleProductPublished(productId: string, publish: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER') {
      return { error: 'Unauthorized' };
    }

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'User not found' };

    const [user, seller] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      }),
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
    }

    await prisma.product.update({
      where: { id: productId },
      data: { published: publish },
    });

    revalidatePath('/seller-hub');
    return { success: true, published: publish };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

interface ReviewData {
  productId: string;
  rating: number;
  comment?: string;
}

export async function submitReview(
  productIdOrData: string | ReviewData,
  rating?: number,
  comment?: string
): Promise<{ success?: boolean; review?: Review; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'Unauthorized' };

    const productId =
      typeof productIdOrData === 'string' ? productIdOrData : productIdOrData.productId;
    const reviewRating = typeof productIdOrData === 'string' ? rating! : productIdOrData.rating;
    const reviewComment = typeof productIdOrData === 'string' ? comment : productIdOrData.comment;

    const review = await prisma.review.create({
      data: {
        productId,
        rating: reviewRating,
        comment: reviewComment,
        userId,
      },
    });

    revalidatePath(`/product/${productId}`);
    return JSON.parse(JSON.stringify({ success: true, review })) as {
      success: boolean;
      review: Review;
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function getAdminTaxonomyData() {
  try {
    const categories = await prisma.category.findMany({ include: { children: true } });
    const tags = await prisma.tag.findMany();
    const collections = await prisma.collection.findMany();
    return { categories, tags, collections };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[getAdminTaxonomyData] Error:', error);
    return { categories: [], tags: [], collections: [] };
  }
}

interface TaxonomyData {
  name: string;
  description?: string;
  image?: string;
}

export async function createTaxonomy(type: 'category' | 'tag' | 'collection', data: TaxonomyData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN')
      return { error: 'Unauthorized' };

    let result;
    const slug = data.name.toLowerCase().replace(/ /g, '-');

    if (type === 'category') {
      result = await prisma.category.create({ data: { ...data, slug } });
    } else if (type === 'tag') {
      result = await prisma.tag.create({ data: { ...data, slug } });
    } else if (type === 'collection') {
      result = await prisma.collection.create({ data: { ...data, slug } });
    }

    revalidatePath('/admin-os');
    // Return only the id — avoids Date serialization errors from the raw Prisma object.
    return { success: true, id: result?.id };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function deleteTaxonomy(type: 'category' | 'tag' | 'collection', id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN')
      return { error: 'Unauthorized' };

    if (type === 'category') {
      await prisma.category.delete({ where: { id } });
    } else if (type === 'tag') {
      await prisma.tag.delete({ where: { id } });
    } else if (type === 'collection') {
      await prisma.collection.delete({ where: { id } });
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function seedTestData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN')
      return { error: 'Unauthorized' };

    const adminId = await getRealUserId(session);

    // Create 3 Test Users
    const testUsers = [
      { email: 'admin@brandy.com', name: 'System Admin', role: Role.ADMIN, pass: 'admin123' },
      { email: 'seller@brandy.com', name: 'Elite Seller', role: Role.SELLER, pass: 'seller123' },
      { email: 'buyer@brandy.com', name: 'Frequent Buyer', role: Role.BUYER, pass: 'buyer123' },
    ];

    for (const u of testUsers) {
      const hashedPassword = await bcrypt.hash(u.pass, BCRYPT_COST);
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role },
        create: {
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: hashedPassword,
        },
      });

      if (u.role === Role.SELLER) {
        await prisma.sellerProfile.upsert({
          where: { userId: user.id },
          update: { status: SellerStatus.ACTIVE },
          create: { userId: user.id, storeName: 'Elite Local Goods', status: SellerStatus.ACTIVE },
        });
      }
    }

    // Create some categories
    const catNames = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty'];
    for (const name of catNames) {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, slug: name.toLowerCase().replace(/ /g, '-') },
      });
    }

    // Create system settings
    const settings = [
      { key: 'VAT_RATE', value: '14.0', description: 'Value Added Tax percentage' },
      { key: 'COMMISSION_BASE', value: '15.0', description: 'Base platform commission' },
    ];
    for (const s of settings) {
      await prisma.systemSettings.upsert({
        where: { key: s.key },
        update: {},
        create: s,
      });
    }

    // Create some audit logs
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'SYSTEM_SEED',
          details: 'Populated platform with initial test data and primary test accounts',
        },
      });
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[seedTestData] Error:', err);
    return { error: error.message || 'Failed to seed data' };
  }
}

export async function toggleWishlist(productId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'User not found' };

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } },
      });
    } else {
      await prisma.wishlist.create({
        data: { userId, productId },
      });
    }

    revalidatePath('/dashboard');
    revalidatePath('/product/[id]');
    return { success: true, isWishlisted: !existing };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

interface ProfileData {
  name?: string;
  phone?: string;
  // The DB column is `avatarUrl` (the older `avatar` form was a silent typo
  // that Prisma rejected). Both keys are accepted on the way in for
  // backwards-compat with old form payloads, and we normalise to avatarUrl.
  avatarUrl?: string | null;
  avatar?: string | null;
}

export async function updateProfile(
  data: ProfileData
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };

    const userId = await getRealUserId(session);
    if (!userId) return { error: 'User not found' };

    const { avatar, avatarUrl, ...rest } = data;
    const update: { name?: string; phone?: string; avatarUrl?: string | null } = { ...rest };
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    else if (avatar !== undefined) update.avatarUrl = avatar;

    await prisma.user.update({
      where: { id: userId },
      data: update,
    });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function adminCreateUser(formData: {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'SELLER' | 'BUYER';
  storeName?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return { error: 'Unauthorized: Session is null. Please log out and log back in.' };
    if ((session.user as SessionUser).role !== Role.ADMIN)
      return {
        error: `Unauthorized: Your role is ${(session.user as SessionUser).role}, but ADMIN is required.`,
      };

    const adminId = await getRealUserId(session);

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: formData.email.toLowerCase().trim() },
    });
    if (existing) return { error: `An account with email "${formData.email}" already exists.` };

    const hashedPassword = await bcrypt.hash(formData.password, BCRYPT_COST);

    const newUser = await prisma.user.create({
      data: {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: formData.role as Role,
      },
    });

    // Auto-create SellerProfile for sellers
    if (formData.role === Role.SELLER) {
      await prisma.sellerProfile.create({
        data: {
          userId: newUser.id,
          storeName: formData.storeName?.trim() || `${formData.name.trim()}'s Store`,
          status: SellerStatus.ACTIVE,
        },
      });
    }

    // Audit log
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: 'CREATED_USER',
          targetId: newUser.id,
          details: `Created ${formData.role} account for ${formData.email}`,
        },
      });
    }

    revalidatePath('/admin-os');
    return { success: true, userId: newUser.id };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[adminCreateUser] Error:', err);
    return { error: error.message || 'Failed to create user.' };
  }
}

export async function adminUpdateUser(
  userId: string,
  data: { name?: string; email?: string; role?: 'ADMIN' | 'SELLER' | 'BUYER' }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return { error: 'Unauthorized: Session is null. Please log out and log back in.' };
    if ((session.user as SessionUser).role !== Role.ADMIN)
      return {
        error: `Unauthorized: Your role is ${(session.user as SessionUser).role}, but ADMIN is required.`,
      };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name?.trim(),
        email: data.email?.toLowerCase().trim(),
        role: data.role as Role,
      },
    });

    revalidatePath('/admin-os');
    // Return only the scalar fields the caller needs — avoids Date serialization issues.
    return { success: true, userId: updatedUser.id };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[adminUpdateUser] Error:', err);
    return { error: error.message || 'Failed to update user.' };
  }
}

export async function adminDeleteUser(userId: string) {
  try {
    const session = await getServerSession(authOptions);

    // Debug logging for session
    if (!session) {
      console.error('[adminDeleteUser] No session found');
      return { error: 'Unauthorized: No session found. Please refresh and try again.' };
    }

    const userRole = (session.user as SessionUser).role;
    if (userRole !== Role.ADMIN) {
      console.error(`[adminDeleteUser] Unauthorized access attempt by role: ${userRole}`);
      return { error: `Unauthorized: Admin role required (Current role: ${userRole})` };
    }

    // Check if user has orders or other non-cascading relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { orders: true, reviews: true, auditLogs: true, productQAs: true },
        },
      },
    });

    if (!user) return { error: 'User not found.' };

    if (
      user._count.orders > 0 ||
      user._count.reviews > 0 ||
      user._count.auditLogs > 0 ||
      user._count.productQAs > 0
    ) {
      // If user has records, perform a "Soft Delete" instead of hard delete to preserve data integrity
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${userId.substring(0, 8)}@brandy.invalid`, // anonymize
          name: 'Deleted User',
          passwordHash: 'DELETED',
        },
      });

      // If it's a seller, also deactivate profile
      await prisma.sellerProfile.updateMany({
        where: { userId },
        data: { status: SellerStatus.BANNED, deletedAt: new Date() },
      });

      revalidatePath('/admin-os');
      return { success: true, message: 'User soft-deleted due to existing activity records.' };
    }

    // Hard delete if no dependent records
    await prisma.user.delete({ where: { id: userId } });

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[adminDeleteUser] Error:', err);
    return { error: error.message || 'Failed to delete user.' };
  }
}
