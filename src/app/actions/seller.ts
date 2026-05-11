'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OrderStatus, SellerStatus, OrderItemStatus, Role } from '@/generated/client';
import bcrypt from 'bcryptjs';

import type { Session } from 'next-auth';
import type { Product, Review, SessionUser } from '@/types';

async function getRealUserId(session: Session | null) {
  if (!session?.user) return null;
  let userId = (session.user as { id: string }).id;
  return userId;
}

export async function getDashboardStats() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "Unauthorized" };
    const role = (session.user as SessionUser).role;

    if (role === 'BUYER') {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { items: { include: { variant: { include: { product: { include: { images: true } } } } } } },
        orderBy: { createdAt: 'desc' }
      });

      const wishlist = await prisma.wishlist.findMany({
        where: { userId },
        include: { product: { include: { images: true } } }
      });

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return {
        myOrders: orders,
        wishlist,
        notifications,
        stats: {
          totalOrders: orders.length,
          wishlistCount: wishlist.length
        }
      };
    }

    if (role === 'SELLER') {
      const seller = await prisma.sellerProfile.findUnique({
        where: { userId },
        include: { 
          products: { 
            include: { images: true, variants: true, category: true, tags: true, collections: true } 
          } 
        }
      });

      if (!seller) return { error: "Seller profile not found. Please contact support or complete your registration." };

      const orders = await prisma.order.findMany({
        where: { items: { some: { variant: { productId: { in: seller.products.map(p => p.id) } } } } },
        include: { items: { include: { variant: true } } },
        orderBy: { createdAt: 'desc' }
      });

      // Real Daily Revenue Aggregation (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const productIds = seller.products.map(p => p.id);

      const dailyStats = await prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: sevenDaysAgo },
          items: { some: { variant: { productId: { in: productIds } } } }
        },
        _sum: { totalAmount: true }
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
              items: { some: { variant: { productId: { in: productIds } } } }
            }
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
                items: { some: { variant: { productId: { in: productIds } } } }
              },
              _sum: { totalAmount: true }
            }),
            prisma.order.aggregate({
              where: {
                createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                items: { some: { variant: { productId: { in: productIds } } } }
              },
              _sum: { totalAmount: true }
            })
          ])
        : [{ _sum: { totalAmount: 0 } }, { _sum: { totalAmount: 0 } }];

      const thisMonthRevenue = thisMonthAgg._sum.totalAmount || 0;
      const prevMonthRevenue = prevMonthAgg._sum.totalAmount || 0;
      const monthlyChangePct = prevMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
        : (thisMonthRevenue > 0 ? 100 : 0);

      // --- Performance Metrics Calculation ---
      const totalSellerOrders = orders.length;
      const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
      const returnedOrders = orders.filter(o => o.status === 'RETURNED').length;
      
      const orderAcceptance = totalSellerOrders > 0 
        ? Math.round(((totalSellerOrders - cancelledOrders) / totalSellerOrders) * 100) 
        : 100;
      
      const returnRate = totalSellerOrders > 0 
        ? Math.round((returnedOrders / totalSellerOrders) * 100) 
        : 0;

      // Shipping Speed (Mocked for now as we don't have shippedAt in Order easily without Shipment join)
      const shippingSpeed = 95; 

      const stats = {
        totalProducts: seller.products.length,
        totalOrders: orders.length,
        balance: seller.balance,
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
          shippingSpeed
        }
      };

      return { 
        currentSeller: seller, 
        myProducts: seller.products, 
        myOrders: orders,
        stats,
        categories: await prisma.category.findMany(),
        tags: await prisma.tag.findMany(),
        collections: await prisma.collection.findMany()
      };
    }

    if (role === 'ADMIN') {
      const sellers = await prisma.sellerProfile.findMany({ include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } } });
      const orders = await prisma.order.findMany({
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: { id: true, flashSalePrice: true, categoryId: true, category: { select: { id: true, name: true } } }
                  }
                }
              }
            }
          },
          user: { select: { id: true, name: true, email: true } }
        }
      });
      const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
      const products = await prisma.product.findMany();
      const auditLogs = await prisma.auditLog.findMany({ include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
      const systemSettings = await prisma.systemSettings.findMany();
      const payouts = await prisma.payout.findMany({ include: { seller: true }, orderBy: { createdAt: 'desc' } });
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
        totalProducts: products.length
      };
      
      return { 
        sellers, 
        orders, 
        users,
        auditLogs,
        systemSettings,
        payouts,
        categories,
        tags,
        collections,
        pendingSellers: sellers.filter(s => s.status === 'PENDING_APPROVAL'),
        stats 
      };
    }

    return { error: "Invalid role" };
} catch (err: unknown) {
    const error = err as Error;
    console.error("[getDashboardStats] Error:", error);
    return { error: "Database connection failed or data could not be retrieved." };
  }
}

export async function getHomepageData() {
  try {
    const categories = await prisma.category.findMany({
      take: 6,
      where: { parentId: null }
    });

    const featuredProducts = await prisma.product.findMany({
      where: { isFeatured: true, published: true },
      include: { images: { where: { isPrimary: true } } },
      take: 4
    });

    const recentProducts = await prisma.product.findMany({
      where: { published: true },
      include: { images: { where: { isPrimary: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    return { categories, featuredProducts, recentProducts };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getHomepageData] Error:", error);
    return { categories: [], featuredProducts: [], recentProducts: [] };
  }
}

export async function updateSellerStatus(sellerId: string, status: SellerStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') return { error: "Unauthorized" };

    const adminId = await getRealUserId(session);

    await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { status }
    });

    // Log action
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: status === 'ACTIVE' ? 'APPROVED_SELLER' : 'SUSPENDED_SELLER',
          targetId: sellerId,
          details: `Status changed to ${status}`
        }
      });
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateSellerStatus] Error:", error);
    return { error: error.message || "Failed to update status" };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    await prisma.order.update({
      where: { id: orderId },
      data: { status }
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
    if (!session) return { error: "Unauthorized" };

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status }
    });

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
  }[];
}

export async function createProduct(data: ProductData): Promise<{ id?: string; error?: string } | Product> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER') return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "User not found" };
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return { error: "Seller profile not found" };

    const { variants, ...rest } = data;

    // Generate unique slug
    let baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 0;
    
    while (true) {
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const product = await prisma.product.create({
      data: {
        ...rest,
        sellerId: seller.id,
        slug,
        description: rest.description || '',
        variants: {
          create: variants?.map((v: { color?: string; price?: number; stock?: number; image?: string }, idx: number) => ({
            sku: `${rest.title.substring(0,3).toUpperCase()}-${(v.color || 'STND').toUpperCase()}-${Date.now().toString().slice(-4)}-${idx}`,
            title: v.color || "Standard",
            attributes: JSON.stringify({ color: v.color || "Standard" }),
            price: v.price || rest.basePrice,
            stockCount: v.stock || 0
          }))
        },
        images: {
          create: variants?.filter((v: { color?: string; price?: number; stock?: number; image?: string }) => v.image).map((v: { image?: string }, idx: number) => ({
            url: v.image!,
            isPrimary: idx === 0
          })) || []
        }
      }
    });

    revalidatePath('/seller-hub');
    return product as unknown as Product;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[createProduct] Error:", err);
    return { error: error.message || "Failed to create product" };
  }
}

interface UpdateProductData {
  title?: string;
  description?: string;
  basePrice?: number;
  categoryId?: string;
  published?: boolean;
}

export async function updateProduct(productId: string, data: UpdateProductData): Promise<{ success?: boolean; error?: string } | Product> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER') return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "User not found" };
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return { error: "Seller profile not found" };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== seller.id) return { error: "Unauthorized to update this product" };

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data
    });

    revalidatePath('/seller-hub');
    return updatedProduct as unknown as Product;
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'SELLER') return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "User not found" };
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return { error: "Seller profile not found" };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.sellerId !== seller.id) return { error: "Unauthorized to delete this product" };

    await prisma.product.delete({ where: { id: productId } });

    revalidatePath('/seller-hub');
    return { success: true };
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

export async function submitReview(productIdOrData: string | ReviewData, rating?: number, comment?: string): Promise<{ success?: boolean; review?: Review; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "Unauthorized" };

    const productId = typeof productIdOrData === 'string' ? productIdOrData : productIdOrData.productId;
    const reviewRating = typeof productIdOrData === 'string' ? rating! : productIdOrData.rating;
    const reviewComment = typeof productIdOrData === 'string' ? comment : productIdOrData.comment;

    const review = await prisma.review.create({
      data: {
        productId,
        rating: reviewRating,
        comment: reviewComment,
        userId,
      }
    });

    revalidatePath(`/product/${productId}`);
    return { success: true, review: review as unknown as Review };
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
    if (!session || (session.user as SessionUser).role !== 'ADMIN') return { error: "Unauthorized" };

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
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    return { error: error.message };
  }
}

export async function deleteTaxonomy(type: 'category' | 'tag' | 'collection', id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'ADMIN') return { error: "Unauthorized" };

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
    if (!session || (session.user as SessionUser).role !== 'ADMIN') return { error: "Unauthorized" };

    const adminId = await getRealUserId(session);

    // Create 3 Test Users
    const testUsers = [
      { email: 'admin@brandy.com', name: 'System Admin', role: Role.ADMIN, pass: 'admin123' },
      { email: 'seller@brandy.com', name: 'Elite Seller', role: Role.SELLER, pass: 'seller123' },
      { email: 'buyer@brandy.com', name: 'Frequent Buyer', role: Role.BUYER, pass: 'buyer123' }
    ];

    for (const u of testUsers) {
      const hashedPassword = await bcrypt.hash(u.pass, 10);
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role },
        create: { 
          email: u.email, 
          name: u.name, 
          role: u.role, 
          passwordHash: hashedPassword 
        }
      });

      if (u.role === Role.SELLER) {
        await prisma.sellerProfile.upsert({
          where: { userId: user.id },
          update: { status: SellerStatus.ACTIVE },
          create: { userId: user.id, storeName: "Elite Local Goods", status: SellerStatus.ACTIVE }
        });
      }
    }

    // Create some categories
    const catNames = ["Electronics", "Fashion", "Home & Kitchen", "Beauty"];
    for (const name of catNames) {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, slug: name.toLowerCase().replace(/ /g, '-') }
      });
    }

    // Create system settings
    const settings = [
      { key: "VAT_RATE", value: "14.0", description: "Value Added Tax percentage" },
      { key: "COMMISSION_BASE", value: "15.0", description: "Base platform commission" }
    ];
    for (const s of settings) {
      await prisma.systemSettings.upsert({
        where: { key: s.key },
        update: {},
        create: s
      });
    }

    // Create some audit logs
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          adminId,
          action: "SYSTEM_SEED",
          details: "Populated platform with initial test data and primary test accounts"
        }
      });
    }

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[seedTestData] Error:", err);
    return { error: error.message || "Failed to seed data" };
  }
}

export async function toggleWishlist(productId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "User not found" };

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } }
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { userId_productId: { userId, productId } }
      });
    } else {
      await prisma.wishlist.create({
        data: { userId, productId }
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
  avatar?: string;
}

export async function updateProfile(data: ProfileData): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const userId = await getRealUserId(session);
    if (!userId) return { error: "User not found" };

    await prisma.user.update({
      where: { id: userId },
      data
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
    if (!session) return { error: 'Unauthorized: Session is null. Please log out and log back in.' };
    if ((session.user as SessionUser).role !== Role.ADMIN) return { error: `Unauthorized: Your role is ${(session.user as SessionUser).role}, but ADMIN is required.` };

    const adminId = await getRealUserId(session);

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email: formData.email.toLowerCase().trim() } });
    if (existing) return { error: `An account with email "${formData.email}" already exists.` };

    const hashedPassword = await bcrypt.hash(formData.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: formData.role as Role,
      }
    });

    // Auto-create SellerProfile for sellers
    if (formData.role === Role.SELLER) {
      await prisma.sellerProfile.create({
        data: {
          userId: newUser.id,
          storeName: formData.storeName?.trim() || `${formData.name.trim()}'s Store`,
          status: SellerStatus.ACTIVE,
        }
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
        }
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

export async function adminUpdateUser(userId: string, data: { name?: string; email?: string; role?: 'ADMIN' | 'SELLER' | 'BUYER' }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Unauthorized: Session is null. Please log out and log back in.' };
    if ((session.user as SessionUser).role !== Role.ADMIN) return { error: `Unauthorized: Your role is ${(session.user as SessionUser).role}, but ADMIN is required.` };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name?.trim(),
        email: data.email?.toLowerCase().trim(),
        role: data.role as Role,
      }
    });

    revalidatePath('/admin-os');
    return { success: true, user: updatedUser };
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
          select: { orders: true, reviews: true, auditLogs: true, productQAs: true }
        }
      }
    });

    if (!user) return { error: 'User not found.' };

    if (user._count.orders > 0 || user._count.reviews > 0 || user._count.auditLogs > 0 || user._count.productQAs > 0) {
      // If user has records, perform a "Soft Delete" instead of hard delete to preserve data integrity
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${userId.substring(0, 8)}@brandy.invalid`, // anonymize
          name: 'Deleted User',
          passwordHash: 'DELETED',
        }
      });
      
      // If it's a seller, also deactivate profile
      await prisma.sellerProfile.updateMany({
        where: { userId },
        data: { status: SellerStatus.BANNED, deletedAt: new Date() }
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
