'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
import { OrderStatus, SellerStatus } from '@/generated/client';

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role === 'BUYER') {
    const myOrders = await prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    return { user: session.user, myOrders };
  }

  if (role === 'SELLER') {
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId },
      include: { products: { include: { images: true, variants: true } } }
    });

    if (!seller) throw new Error("Seller profile not found");

    const orders = await prisma.order.findMany({
      where: { items: { some: { variant: { productId: { in: seller.products.map(p => p.id) } } } } },
      include: { items: { include: { variant: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return { seller, orders };
  }

  if (role === 'ADMIN') {
    const sellers = await prisma.sellerProfile.findMany({ include: { user: true } });
    const orders = await prisma.order.findMany({ include: { items: true, user: true } });
    const stats = {
      totalRevenue: orders.reduce((acc, o) => acc + o.totalAmount, 0),
      totalOrders: orders.length,
      totalSellers: sellers.length
    };
    return { sellers, orders, stats };
  }

  return {};
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
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error("Unauthorized");

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { status }
  });

  revalidatePath('/admin-os');
  return { success: true };
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

export async function createProduct(data: any) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'SELLER') throw new Error("Unauthorized");

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!seller) throw new Error("Seller profile not found");

  const product = await prisma.product.create({
    data: {
      ...data,
      sellerId: seller.id,
      slug: data.title.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
    }
  });

  revalidatePath('/seller-hub');
  return product;
}

export async function updateProduct(productId: string, data: any) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const product = await prisma.product.update({
    where: { id: productId },
    data
  });

  revalidatePath('/seller-hub');
  return product;
}

export async function deleteProduct(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

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
