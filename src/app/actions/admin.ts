'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Tax configuration
export async function updateTaxSettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");

  const vatRate = parseFloat(formData.get('vatRate') as string) || 14;
  const platformFee = parseFloat(formData.get('platformFee') as string) || 15;

  // Store in settings (using a simple key-value approach)
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "Settings" (key TEXT PRIMARY KEY, value TEXT)`;
  await prisma.$executeRaw`INSERT INTO "Settings" (key, value) VALUES ('vatRate', ${vatRate.toString()}) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`;
  await prisma.$executeRaw`INSERT INTO "Settings" (key, value) VALUES ('platformFee', ${platformFee.toString()}) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`;

  revalidatePath('/admin-os');
  return { success: true };
}

export async function getTaxSettings() {
  try {
    const vatResult: any = await prisma.$queryRaw`SELECT value FROM "Settings" WHERE key = 'vatRate'`;
    const feeResult: any = await prisma.$queryRaw`SELECT value FROM "Settings" WHERE key = 'platformFee'`;
    return {
      vatRate: vatResult[0] ? parseFloat(vatResult[0].value) : 14,
      platformFee: feeResult[0] ? parseFloat(feeResult[0].value) : 15,
    };
  } catch {
    return { vatRate: 14, platformFee: 15 };
  }
}

// Data export/import
export async function exportData(type: 'products' | 'orders' | 'users') {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");

  let data: any[] = [];
  switch (type) {
    case 'products':
      data = await prisma.product.findMany({ include: { seller: true, category: true, variants: true } });
      break;
    case 'orders':
      data = await prisma.order.findMany({ include: { items: true, user: true } });
      break;
    case 'users':
      data = await prisma.user.findMany({ include: { sellerProfile: true } });
      break;
  }

  return { data, type };
}

export async function importProducts(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') throw new Error("Unauthorized");

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
          data: p.variants.map((v: any) => ({
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
