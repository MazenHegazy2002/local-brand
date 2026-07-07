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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          loyaltyPoints: true,
          emailVerified: true,
        },
      });

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
          user,
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
          user: true,
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

      const recentOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          items: { some: { variant: { productId: { in: productIds } } } },
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
      });

      // Map to 7-day array
      const dailyRevenue = new Array(7).fill(0);
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().split('T')[0];

        const dailySum = recentOrders
          .filter(o => o.createdAt.toISOString().split('T')[0] === dayStr)
          .reduce((sum, o) => sum + o.totalAmount, 0);

        dailyRevenue[i] = dailySum;
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
        orderBy: { createdAt: 'desc' },
        take: 100,
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
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          images: true,
          variants: { select: { id: true, stockCount: true, price: true } },
          category: { select: { id: true, name: true } },
          seller: { select: { id: true, storeName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
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
        take: 100,
      });
      const categories = await prisma.category.findMany({ include: { children: true } });
      const tags = await prisma.tag.findMany();
      const collections = await prisma.collection.findMany();

      // Query database-wide totals for correct dashboard statistics
      const [totalOrders, totalSellers, totalUsers, totalProducts, orderAgg] = await Promise.all([
        prisma.order.count(),
        prisma.sellerProfile.count(),
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.order.aggregate({
          _sum: { totalAmount: true, platformFee: true },
        }),
      ]);

      const totalRevenue = orderAgg._sum.totalAmount || 0;
      const totalPlatformFees = orderAgg._sum.platformFee || 0;

      const stats = {
        revenue: totalRevenue,
        platformFees: totalPlatformFees,
        totalOrders,
        totalSellers,
        totalUsers,
        totalProducts,
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

    const profile = await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { status },
      include: { user: true },
    });

    if (status === 'ACTIVE') {
      await prisma.user.update({
        where: { id: profile.userId },
        data: { emailVerified: profile.user.emailVerified || new Date() },
      });

      try {
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
          to: profile.user.email,
          subject: 'Your Brandy seller account has been approved!',
          html: `<p>Hi ${profile.user.name || 'Seller'},</p><p>Congratulations! Your seller application for store <strong>${profile.storeName}</strong> has been approved. You can now access your Seller Hub, list products, and start selling!</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/seller-hub">Go to Seller Hub</a></p>`,
        });
      } catch (emailErr) {
        console.error('[updateSellerStatus] Failed to send approval email:', emailErr);
      }
    }

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
    const role = (session.user as SessionUser).role;
    if (role !== 'SELLER' && role !== 'ADMIN') return { error: 'Forbidden' };

    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    // Best-effort status transition notification email.
    void (async () => {
      try {
        const { triggerOrderStatusEmail } = await import('@/lib/email');
        await triggerOrderStatusEmail(orderId, status);
      } catch (err) {
        console.error('Failed to trigger order status email:', err);
      }
    })();

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
    const role = (session.user as SessionUser).role;
    if (role !== 'SELLER' && role !== 'ADMIN') return { error: 'Forbidden' };

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

    // ── Input validation ──────────────────────────────────────────────────────
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length < 3)
        return { error: 'Product title must be at least 3 characters.' };
      if (data.title.trim().length > 200)
        return { error: 'Product title cannot exceed 200 characters.' };
    }
    if (data.description !== undefined && data.description !== null) {
      const descLen = data.description.trim().length;
      if (descLen > 0 && descLen < 20)
        return {
          error:
            'Product description must be at least 20 characters (aim for 100–300 words for better sales).',
        };
    }
    if (data.basePrice !== undefined) {
      if (data.basePrice <= 0) return { error: 'Product price must be greater than zero.' };
    }

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

    await prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        published: false,
      },
    });

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

    // Verify Purchase (Only allow reviews if the user bought and received it via this specific order item)
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        status: 'DELIVERED',
        order: { userId },
        variant: { productId },
        review: null,
      },
    });

    if (!orderItem) {
      return { error: 'You can only review products you have purchased and received.' };
    }

    // Get product title for the loyalty description
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { title: true },
    });

    // Create Review and award points atomically
    const { POINTS_PER_REVIEW } = await import('@/lib/loyalty-constants');

    const [review] = await prisma.$transaction([
      prisma.review.create({
        data: {
          productId,
          rating: reviewRating,
          comment: reviewComment,
          userId,
          orderItemId: orderItem.id,
          verifiedPurchase: true,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: POINTS_PER_REVIEW } },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          userId,
          amount: POINTS_PER_REVIEW,
          type: 'EARNED_BY_REVIEW',
          description: product?.title
            ? `Earned ${POINTS_PER_REVIEW} pts for reviewing "${product.title}"`
            : `Earned ${POINTS_PER_REVIEW} pts for review`,
        },
      }),
    ]);

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

    const name = data.name.trim();
    const slug = name.toLowerCase().replace(/ /g, '-');
    let result;

    if (type === 'category') {
      const existing = await prisma.category.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (existing) {
        return { error: 'Category name or slug already exists' };
      }
      result = await prisma.category.create({ data: { ...data, name, slug } });
    } else if (type === 'tag') {
      const existing = await prisma.tag.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (existing) {
        return { error: 'Tag name or slug already exists' };
      }
      result = await prisma.tag.create({ data: { ...data, name, slug } });
    } else if (type === 'collection') {
      const existing = await prisma.collection.findFirst({
        where: { OR: [{ name }, { slug }] },
      });
      if (existing) {
        return { error: 'Collection name or slug already exists' };
      }
      result = await prisma.collection.create({ data: { ...data, name, slug } });
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
      const crypto = await import('crypto');
      const lockHash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), BCRYPT_COST);

      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${userId.substring(0, 8)}@brandy.invalid`, // anonymize
          name: 'Deleted User',
          passwordHash: lockHash,
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

/**
 * Triggers a manual template resend/send for an order.
 */
export async function triggerWhatsAppManual(orderId: string, phone: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return { error: 'Unauthorized' };
    }

    const { sendWhatsAppConfirmation } = await import('@/lib/whatsapp');
    const result = await sendWhatsAppConfirmation(orderId, phone);

    if (result.success) {
      const adminId = await getRealUserId(session);
      // Only write the audit log when the admin user still exists in the DB
      // (stale JWT tokens can carry an id for a deleted account, which would
      // violate the AuditLog_adminId_fkey FK constraint).
      const adminExists = adminId
        ? await prisma.user.findUnique({ where: { id: adminId }, select: { id: true } })
        : null;
      if (adminExists) {
        await prisma.auditLog.create({
          data: {
            adminId: adminExists.id,
            action: 'WHATSAPP_MANUAL_SEND',
            targetId: orderId,
            details: JSON.stringify({ phone, messageId: result.messageId }),
          },
        });
      } else {
        console.warn(
          '[triggerWhatsAppManual] Skipping audit log — admin user not found in DB for id:',
          adminId
        );
      }
      revalidatePath('/admin-os');
      return { success: true };
    } else {
      return { error: result.error || 'Failed to dispatch WhatsApp message.' };
    }
  } catch (err: any) {
    console.error('[triggerWhatsAppManual] Error:', err);
    return { error: err.message || 'Error occurred.' };
  }
}

/**
 * Manually confirm or cancel an order, bypassing the automated bot.
 */
export async function overrideWhatsAppStatus(orderId: string, status: 'CONFIRMED' | 'CANCELLED') {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') {
      return { error: 'Unauthorized' };
    }

    const sessionAdminId = (session.user as SessionUser).id;
    // Verify the admin user still exists to avoid AuditLog_adminId_fkey violations
    // when the JWT is stale (e.g., account was deleted after the token was issued).
    const adminExists = sessionAdminId
      ? await prisma.user.findUnique({ where: { id: sessionAdminId }, select: { id: true } })
      : null;
    const adminId = adminExists ? sessionAdminId : null;

    if (status === 'CONFIRMED') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          whatsappConfirmStatus: 'CONFIRMED',
          status: 'CONFIRMED',
        },
      });
    } else if (status === 'CANCELLED') {
      await prisma.$transaction(async tx => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            whatsappConfirmStatus: 'CANCELLED',
            status: 'CANCELLED',
          },
        });

        const items = await tx.orderItem.findMany({
          where: { orderId },
        });

        for (const item of items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockCount: { increment: item.quantity },
            },
          });
        }
      });
    }

    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: `WHATSAPP_OVERRIDE_${status}`,
          targetId: orderId,
          details: JSON.stringify({ status }),
        },
      });
    } else {
      console.warn(
        '[overrideWhatsAppStatus] Skipping audit log — admin user not found in DB for id:',
        sessionAdminId
      );
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: any) {
    console.error('[overrideWhatsAppStatus] Error:', err);
    return { error: err.message || 'Error occurred.' };
  }
}

export async function cancelOrderBySeller(
  orderId: string,
  reason: string,
  markSoldOut: boolean
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized' };
    const role = (session.user as SessionUser).role;
    if (role !== 'SELLER' && role !== 'ADMIN') return { error: 'Forbidden' };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return { error: 'Order not found' };

    let sellerProductIds: string[] = [];
    if (role === 'SELLER') {
      const seller = await prisma.sellerProfile.findUnique({
        where: { userId: (session.user as SessionUser).id },
        include: { products: { select: { id: true } } },
      });
      if (!seller) return { error: 'Seller profile not found' };
      sellerProductIds = seller.products.map(p => p.id);
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { orderId },
      include: { variant: { select: { productId: true } } },
    });

    const isOwnOrder =
      role === 'ADMIN' ||
      orderItems.some(item => sellerProductIds.includes(item.variant.productId));
    if (!isOwnOrder) return { error: 'Unauthorized order cancellation' };

    await prisma.$transaction(async tx => {
      for (const item of orderItems) {
        const belongsToSeller =
          role === 'ADMIN' || sellerProductIds.includes(item.variant.productId);

        if (belongsToSeller) {
          if (markSoldOut) {
            // Set stockCount to 0 for this variant
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockCount: 0 },
            });
          } else {
            // Restore stock count normally
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockCount: { increment: item.quantity } },
            });
          }
        } else {
          // Items belonging to other sellers are restored normally
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockCount: { increment: item.quantity } },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
        },
      });

      await tx.orderItem.updateMany({
        where: { orderId },
        data: { status: 'CANCELLED' },
      });
    });

    // Best-effort status transition notification email.
    void (async () => {
      try {
        const { triggerOrderStatusEmail } = await import('@/lib/email');
        await triggerOrderStatusEmail(orderId, 'CANCELLED');
      } catch (err) {
        console.error('Failed to trigger order status email:', err);
      }
    })();

    revalidatePath('/seller-hub');
    revalidatePath('/dashboard');
    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: any) {
    console.error('[cancelOrderBySeller] Error:', err);
    return { error: err.message || 'Error occurred.' };
  }
}
