'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { OrderStatus, SellerStatus, OrderItemStatus } from '@/generated/client';
import bcrypt from 'bcryptjs';

export async function getDashboardStats() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

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

      const stats = {
        totalProducts: seller.products.length,
        totalOrders: orders.length,
        balance: seller.balance,
        revenue: orders.reduce((acc, o) => acc + o.totalAmount, 0),
        dailyRevenue: []
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
      const orders = await prisma.order.findMany({ include: { items: { include: { variant: true } }, user: { select: { id: true, name: true, email: true } } } });
      const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
      const products = await prisma.product.findMany();
      const auditLogs = await prisma.auditLog.findMany({ include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
      const systemSettings = await prisma.systemSettings.findMany();
      const payouts = await prisma.payout.findMany({ include: { seller: true }, orderBy: { createdAt: 'desc' } });
      const categories = await prisma.category.findMany({ include: { children: true } });
      const tags = await prisma.tag.findMany();
      const collections = await prisma.collection.findMany();
      
      const stats = {
        revenue: orders.reduce((acc, o) => acc + o.totalAmount, 0),
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
  } catch (err: any) {
    console.error("[getDashboardStats] Error:", err);
    return { error: "Database connection failed or data could not be retrieved." };
  }
}

export async function getHomepageData() {
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
}

export async function updateSellerStatus(sellerId: string, status: SellerStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') return { error: "Unauthorized" };

    let adminId = (session.user as any).id;
    if (adminId.startsWith('debug-')) {
      const dbAdmin = await prisma.user.findUnique({ where: { email: session.user?.email! } });
      if (dbAdmin) adminId = dbAdmin.id;
    }

    await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: { status }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        adminId: adminId,
        action: status === 'ACTIVE' ? 'APPROVED_SELLER' : 'SUSPENDED_SELLER',
        targetId: sellerId,
        details: `Status changed to ${status}`
      }
    });

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: any) {
    console.error("[updateSellerStatus] Error:", err);
    return { error: err.message || "Failed to update status" };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await prisma.order.update({
    where: { id: orderId },
    data: { status }
  });

  revalidatePath('/dashboard');
  revalidatePath('/admin-os');
  return { success: true };
}

export async function updateOrderItemStatus(itemId: string, status: OrderItemStatus) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { status }
  });

  revalidatePath('/seller-hub');
  return { success: true };
}

export async function createProduct(data: any) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'SELLER') throw new Error("Unauthorized");

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!seller) throw new Error("Seller profile not found");

  const { variants, ...rest } = data;

  const product = await prisma.product.create({
    data: {
      ...rest,
      sellerId: seller.id,
      slug: data.title.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
      variants: {
        create: variants?.map((v: any) => ({
          sku: `${rest.title.substring(0,3).toUpperCase()}-${v.color.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          title: v.color,
          attributes: JSON.stringify({ color: v.color }),
          price: v.price || rest.basePrice,
          stockCount: v.stock || 0
        }))
      },
      images: {
        create: variants?.filter((v: any) => v.image).map((v: any) => ({
          url: v.image, // Base64 string for now
          isPrimary: true
        })) || []
      }
    }
  });

  revalidatePath('/seller-hub');
  return product;
}

export async function updateProduct(productId: string, data: any) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'SELLER') throw new Error("Unauthorized");

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!seller) throw new Error("Seller profile not found");

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== seller.id) throw new Error("Unauthorized to update this product");

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data
  });

  revalidatePath('/seller-hub');
  return updatedProduct;
}

export async function deleteProduct(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'SELLER') throw new Error("Unauthorized");

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!seller) throw new Error("Seller profile not found");

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== seller.id) throw new Error("Unauthorized to delete this product");

  await prisma.product.delete({ where: { id: productId } });

  revalidatePath('/seller-hub');
  return { success: true };
}

export async function submitReview(productIdOrData: any, rating?: number, comment?: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  let data;
  if (typeof productIdOrData === 'object' && !rating) {
    data = productIdOrData;
  } else {
    data = { productId: productIdOrData, rating, comment };
  }

  const review = await prisma.review.create({
    data: {
      ...data,
      userId: (session.user as any).id
    }
  });

  revalidatePath(`/product/${data.productId}`);
  return { success: true, review };
}

export async function getAdminTaxonomyData() {
  const categories = await prisma.category.findMany({ include: { children: true } });
  const tags = await prisma.tag.findMany();
  const collections = await prisma.collection.findMany();

  return { categories, tags, collections };
}

export async function createTaxonomy(type: 'category' | 'tag' | 'collection', data: any) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error("Unauthorized");

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
}

export async function deleteTaxonomy(type: 'category' | 'tag' | 'collection', id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error("Unauthorized");

  if (type === 'category') {
    await prisma.category.delete({ where: { id } });
  } else if (type === 'tag') {
    await prisma.tag.delete({ where: { id } });
  } else if (type === 'collection') {
    await prisma.collection.delete({ where: { id } });
  }

  revalidatePath('/admin-os');
  return { success: true };
}

export async function updateProductTaxonomies(productId: string, taxonomyData: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  // Logic to update tags/collections for a product
  // This would typically involve disconnecting old ones and connecting new ones
  
  revalidatePath('/seller-hub');
  return { success: true };
}

export async function seedTestData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') return { error: "Unauthorized" };

    let adminId = (session.user as any).id;

    // Create 3 Test Users
    const testUsers = [
      { email: 'admin@localbrand.com', name: 'System Admin', role: 'ADMIN', pass: 'admin123' },
      { email: 'seller@localbrand.com', name: 'Elite Seller', role: 'SELLER', pass: 'seller123' },
      { email: 'buyer@localbrand.com', name: 'Frequent Buyer', role: 'BUYER', pass: 'buyer123' }
    ];

    for (const u of testUsers) {
      const hashedPassword = await bcrypt.hash(u.pass, 10);
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role as any },
        create: { 
          email: u.email, 
          name: u.name, 
          role: u.role as any, 
          passwordHash: hashedPassword 
        }
      });

      if (u.email === session.user?.email && adminId.startsWith('debug-')) {
        adminId = user.id; // Update to the real DB ID
      }

      if (u.role === 'SELLER') {
        await prisma.sellerProfile.upsert({
          where: { userId: user.id },
          update: { status: 'ACTIVE' },
          create: { userId: user.id, storeName: "Elite Local Goods", status: 'ACTIVE' }
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
    await prisma.auditLog.create({
      data: {
        adminId: adminId,
        action: "SYSTEM_SEED",
        details: "Populated platform with initial test data and primary test accounts"
      }
    });

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: any) {
    console.error("[seedTestData] Error:", err);
    return { error: err.message || "Failed to seed data" };
  }
}

export async function toggleWishlist(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const userId = (session.user as any).id;
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
}

export async function updateProfile(data: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data
  });

  revalidatePath('/dashboard');
  return { success: true };
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
    if ((session.user as any).role !== 'ADMIN') return { error: `Unauthorized: Your role is ${(session.user as any)?.role}, but ADMIN is required.` };

    // Resolve real admin ID (handles debug bypass sessions)
    let adminId = (session.user as any).id;
    if (adminId.startsWith('debug-')) {
      const dbAdmin = await prisma.user.findUnique({ where: { email: session.user?.email! } });
      if (dbAdmin) adminId = dbAdmin.id;
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email: formData.email.toLowerCase().trim() } });
    if (existing) return { error: `An account with email "${formData.email}" already exists.` };

    const hashedPassword = await bcrypt.hash(formData.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role: formData.role,
      }
    });

    // Auto-create SellerProfile for sellers
    if (formData.role === 'SELLER') {
      await prisma.sellerProfile.create({
        data: {
          userId: newUser.id,
          storeName: formData.storeName?.trim() || `${formData.name.trim()}'s Store`,
          status: 'ACTIVE',
        }
      });
    }

    // Audit log
    if (adminId && !adminId.startsWith('debug-')) {
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
  } catch (err: any) {
    console.error('[adminCreateUser] Error:', err);
    return { error: err.message || 'Failed to create user.' };
  }
}

export async function adminDeleteUser(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') return { error: 'Unauthorized' };

    // Prevent self-deletion
    if ((session.user as any).id === userId) return { error: 'You cannot delete your own account.' };

    await prisma.user.delete({ where: { id: userId } });

    revalidatePath('/admin-os');
    return { success: true };
  } catch (err: any) {
    console.error('[adminDeleteUser] Error:', err);
    return { error: err.message || 'Failed to delete user.' };
  }
}
