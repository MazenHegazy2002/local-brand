'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { SessionUser, Product, Order, User } from '@/types';

// Tax configuration
export async function updateTaxSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') throw new Error("Unauthorized");

  const vatRate = parseFloat(formData.get('vatRate') as string) || 14;
  const platformFee = parseFloat(formData.get('platformFee') as string) || 15;

  await prisma.systemSettings.upsert({
    where: { key: 'VAT_RATE' },
    update: { value: vatRate.toString() },
    create: { key: 'VAT_RATE', value: vatRate.toString(), description: "Value Added Tax percentage" }
  });

  await prisma.systemSettings.upsert({
    where: { key: 'COMMISSION_BASE' },
    update: { value: platformFee.toString() },
    create: { key: 'COMMISSION_BASE', value: platformFee.toString(), description: "Base platform commission" }
  });

  revalidatePath('/admin-os');
  return { success: true };
}

export async function getTaxSettings() {
  try {
    const vatSetting = await prisma.systemSettings.findUnique({ where: { key: 'VAT_RATE' } });
    const feeSetting = await prisma.systemSettings.findUnique({ where: { key: 'COMMISSION_BASE' } });
    return {
      vatRate: vatSetting ? parseFloat(vatSetting.value) : 14,
      platformFee: feeSetting ? parseFloat(feeSetting.value) : 15,
    };
  } catch {
    return { vatRate: 14, platformFee: 15 };
  }
}

// Data export/import
export async function exportData(type: 'products' | 'orders' | 'users') {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') throw new Error("Unauthorized");

  let data: Product[] | Order[] | User[] = [];
  switch (type) {
    case 'products':
      data = await prisma.product.findMany({ include: { seller: true, category: true, variants: true } }) as unknown as Product[];
      break;
    case 'orders':
      data = await prisma.order.findMany({ include: { items: true, user: true } }) as unknown as Order[];
      break;
    case 'users':
      data = await prisma.user.findMany({ include: { sellerProfile: true } }) as unknown as User[];
      break;
  }

  return { data, type };
}

export async function importProducts(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') throw new Error("Unauthorized");

  const file = formData.get('file') as File;
  if (!file) throw new Error("No file provided");

  const text = await file.text();
  const products = JSON.parse(text);

  for (const p of products) {
    try {
      const category = await prisma.category.findUnique({ where: { name: p.category || 'General' } });
      if (!category) continue;

      const product = await prisma.product.create({
        data: {
          title: p.title,
          description: p.description || '',
          basePrice: p.price || 0,
          slug: p.title.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
          sellerId: p.sellerId,
          categoryId: category.id,
        }
      });

      if (p.variants?.length > 0) {
        await prisma.productVariant.createMany({
          data: p.variants.map((v: { sku?: string; title?: string; attributes?: Record<string, unknown>; price?: number; stock?: number }) => ({
            productId: product.id,
            sku: v.sku || `SKU-${Date.now()}`,
            title: v.title || 'Standard',
            attributes: JSON.stringify(v.attributes || {}),
            price: v.price || p.price || 0,
            stockCount: v.stock || 0,
          }))
        });
      }
    } catch (e) {
      console.error('Import error for product:', p.title, e);
    }
  }

  revalidatePath('/admin-os');
  return { success: true, count: products.length };
}
