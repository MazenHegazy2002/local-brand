'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const role = (session.user as any)?.role;
  const userId = (session.user as any)?.id;

  const stats = {
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0,
    balance: 0
  };

  if (role === 'ADMIN') {
    stats.totalUsers = await prisma.user.count();
    stats.totalProducts = await prisma.product.count();
    stats.totalOrders = await prisma.order.count();
    const rev = await prisma.order.aggregate({ _sum: { totalAmount: true } });
    stats.revenue = rev._sum.totalAmount || 0;
    
    const recentUsers = await prisma.user.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    const recentProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { images: true }
    });

    // Pending sellers for admin to review
    const pendingSellers = await prisma.sellerProfile.findMany({
      where: { status: 'PENDING_APPROVAL' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });
    
    return { 
      type: 'ADMIN', 
      stats,
      recentUsers,
      recentProducts,
      pendingSellers,
      myProducts: [],
      myOrders: []
    };
  }

  if (role === 'SELLER') {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error("Seller profile missing");

    stats.totalProducts = await prisma.product.count({ where: { sellerId: profile.id } });
    const myProducts = await prisma.product.findMany({
      where: { sellerId: profile.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { images: true }
    });
    const myOrders = await prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
    const rev = await prisma.order.aggregate({ _sum: { totalAmount: true } });
    
    // Fetch global taxonomies for Seller to pick from
    const [tags, collections, categories] = await Promise.all([
      prisma.tag.findMany(),
      prisma.collection.findMany(),
      prisma.category.findMany()
    ]);

    return {
      type: 'SELLER',
      stats: { ...stats, revenue: rev._sum.totalAmount || 0, balance: profile.balance },
      myProducts,
      myOrders,
      currentSeller: profile,
      recentUsers: [],
      recentProducts: [],
      tags,
      collections,
      categories
    };
  }

  // BUYER
  const myOrders = await prisma.order.findMany({
    where: { userId },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  const recentProducts = await prisma.product.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: { images: true }
  });
  return {
    type: 'BUYER',
    stats,
    myOrders,
    recentProducts,
    recentUsers: [],
    myProducts: []
  };
}

export async function getHomepageData() {
  try {
    const categories = await prisma.category.findMany({ take: 6 });
    const featuredProducts = await prisma.product.findMany({ 
      where: { isFeatured: true, published: true }, 
      take: 4,
      include: { images: true }
    });
    const recentProducts = await prisma.product.findMany({ 
      where: { published: true }, 
      take: 6,
      include: { images: true }
    });
    return { categories, featuredProducts, recentProducts };
  } catch {
    return { categories: [], featuredProducts: [], recentProducts: [] };
  }
}

export async function updateSellerStatus(sellerId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { status }
  });
  revalidatePath('/admin-os');
}

export async function updateOrderStatus(orderId: string, status: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await prisma.order.update({
    where: { id: orderId },
    data: { status }
  });
  revalidatePath('/dashboard');
  revalidatePath('/seller-hub');
}

export async function deleteProduct(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'SELLER') throw new Error("Unauthorized");

  await prisma.product.update({
    where: { id: productId },
    data: { published: false }
  });
  revalidatePath('/seller-hub');
}

export async function createProduct(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'SELLER') throw new Error("Unauthorized");

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) throw new Error("Seller profile not found");

  const title = formData.get('title') as string;
  const description = formData.get('description') as string || '';
  const basePrice = parseFloat(formData.get('price') as string);
  const categoryName = formData.get('category') as string || 'General';
  const imageUrl = formData.get('imageUrl') as string;
  const stock = parseInt(formData.get('stock') as string) || 0;
  
  // Parse colors/sizes
  const sizes = (formData.get('sizes') as string || '').split(',').map(s => s.trim()).filter(Boolean);
  const colors = (formData.get('colors') as string || '').split(',').map(s => s.trim()).filter(Boolean);

  const tags = formData.getAll('tags') as string[];
  const collections = formData.getAll('collections') as string[];

  let category = await prisma.category.findUnique({ where: { slug: categoryName.toLowerCase() } });
  if (!category) {
    category = await prisma.category.create({ data: { name: categoryName, slug: categoryName.toLowerCase() } });
  }

  // Create Product Base
  const product = await prisma.product.create({
    data: {
      title,
      description,
      basePrice,
      slug: title.toLowerCase().replace(/ /g, '-').slice(0, 50) + '-' + Date.now(),
      sellerId: profile.id,
      categoryId: category.id,
      tags: { connect: tags.map(id => ({ id })) },
      collections: { connect: collections.map(id => ({ id })) }
    }
  });

  // Attach Image
  if (imageUrl) {
    await prisma.productImage.create({
      data: { productId: product.id, url: imageUrl, isPrimary: true }
    });
  }

  // Generate Variants based on Size/Color matrix (or just one generic variant if none provided)
  const variantsToCreate = [];
  
  if (sizes.length === 0 && colors.length === 0) {
    // Standard unvarianted item
    variantsToCreate.push({
      productId: product.id,
      sku: `SKU-${product.id.split('-')[0].toUpperCase()}`,
      title: 'Standard',
      attributes: JSON.stringify({}),
      price: basePrice,
      stockCount: stock
    });
  } else {
    // Matrix generation
    const fallBackSizes = sizes.length ? sizes : ['Standard'];
    const fallBackColors = colors.length ? colors : ['Standard'];
    
    // Split the stock evenly across variants
    const totalVariants = fallBackSizes.length * fallBackColors.length;
    const stockPerVariant = Math.floor(stock / totalVariants);

    for (const s of fallBackSizes) {
      for (const c of fallBackColors) {
        variantsToCreate.push({
          productId: product.id,
          sku: `SKU-${product.id.split('-')[0].toUpperCase()}-${s.substring(0,3).toUpperCase()}-${c.substring(0,3).toUpperCase()}`,
          title: `${c !== 'Standard' ? c : ''} ${s !== 'Standard' ? s : ''}`.trim() || 'Standard',
          attributes: JSON.stringify({ size: s !== 'Standard' ? s : undefined, color: c !== 'Standard' ? c : undefined }),
          price: basePrice,
          stockCount: stockPerVariant
        });
      }
    }
  }

  await prisma.productVariant.createMany({
    data: variantsToCreate
  });

  revalidatePath('/seller-hub');
  return { success: true };
}

export async function createOrder(cartItems: any[], addressInfo: any, paymentMethod: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized. Please log in to checkout.");

  const userId = (session.user as any).id;
  let totalAmount = 0;
  const orderItemsData = [];

  for (const item of cartItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.id },
      include: { variants: true, seller: true }
    });
    
    if (!product) throw new Error(`Product ${item.name} not found`);
    
    const variant = product.variants[0];
    if (!variant) throw new Error(`No variant found for ${product.title}`);

    // Atomic stock check and decrement
    if (variant.stockCount < item.qty) {
      throw new Error(`Out of stock: ${product.title} only has ${variant.stockCount} remaining.`);
    }

    const updatedVariant = await prisma.productVariant.updateMany({
      where: { id: variant.id, stockCount: { gte: item.qty } },
      data: { stockCount: { decrement: item.qty } }
    });

    if (updatedVariant.count === 0) {
      throw new Error(`Concurrency error: ${product.title} just sold out.`);
    }

    const price = product.basePrice;
    totalAmount += price * item.qty;

    orderItemsData.push({
      variantId: variant.id,
      productTitleSnapshot: product.title,
      sellerNameSnapshot: product.seller.storeName,
      priceAtPurchase: price,
      quantity: item.qty,
      status: 'PENDING'
    });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount,
      shippingFee: 50,
      paymentMethod: paymentMethod === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'CASH_ON_DELIVERY',
      paymentStatus: paymentMethod === 'CASH_ON_DELIVERY' ? 'UNPAID' : 'PAID',
      status: 'CONFIRMED', 
      shippingAddressSnapshot: JSON.stringify(addressInfo),
      items: {
        create: orderItemsData as any
      }
    }
  });

  revalidatePath('/dashboard');
  return { success: true, orderId: order.id };
}

// ─── ADMIN TAXONOMY MANAGEMENT ─────────────────────────────────────────────

export async function createTaxonomy(type: 'CATEGORY' | 'TAG' | 'COLLECTION', name: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  if (type === 'CATEGORY') await prisma.category.create({ data: { name, slug } });
  if (type === 'TAG') await prisma.tag.create({ data: { name, slug } });
  if (type === 'COLLECTION') await prisma.collection.create({ data: { name, slug } });
  
  revalidatePath('/admin-os');
}

export async function deleteTaxonomy(type: 'CATEGORY' | 'TAG' | 'COLLECTION', id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");
  
  if (type === 'CATEGORY') await prisma.category.delete({ where: { id } });
  if (type === 'TAG') await prisma.tag.delete({ where: { id } });
  if (type === 'COLLECTION') await prisma.collection.delete({ where: { id } });
  
  revalidatePath('/admin-os');
}

export async function updateProductTaxonomies(productId: string, tagIds: string[], collectionIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");

  // Disconnect all first to reset, then connect new ones
  await prisma.product.update({
    where: { id: productId },
    data: {
      tags: { set: [] },
      collections: { set: [] }
    }
  });

  const connectTags = tagIds.map(id => ({ id }));
  const connectCols = collectionIds.map(id => ({ id }));

  await prisma.product.update({
    where: { id: productId },
    data: {
      tags: { connect: connectTags },
      collections: { connect: connectCols }
    }
  });
  
  revalidatePath('/admin-os');
}

export async function getAdminTaxonomyData() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");

  const [categories, tags, collections, products] = await Promise.all([
    prisma.category.findMany(),
    prisma.tag.findMany(),
    prisma.collection.findMany(),
    prisma.product.findMany({
      include: { tags: true, collections: true },
      orderBy: { createdAt: 'desc' },
      take: 200 // reasonable limit for admin UI
    })
  ]);

  return { categories, tags, collections, products };
}

