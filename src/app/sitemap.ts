import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { PLATFORM_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = PLATFORM_URL;
  const now = new Date();

  // Static pages — public content pages only (auth/account pages excluded)
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/flash-sales`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/lookbook`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/affiliate`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/help/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    {
      url: `${baseUrl}/legal/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/legal/returns-refunds`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/legal/shipping-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/legal/seller-terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Product pages (max 1000 per sitemap)
    const products = await prisma.product.findMany({
      where: { published: true, deletedAt: null },
      select: { id: true, slug: true, updatedAt: true },
      take: 1000,
    });

    const productRoutes = products.map(p => ({
      url: `${baseUrl}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Category pages
    const categories = await prisma.category.findMany({
      select: { slug: true },
    });

    const categoryRoutes = categories.map(c => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Brand pages
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { storeName: true, updatedAt: true },
    });

    const brandRoutes = sellers.map(s => ({
      url: `${baseUrl}/brand/${s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      lastModified: s.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    dynamicRoutes = [...productRoutes, ...categoryRoutes, ...brandRoutes];
  } catch {
    // DB not available during static build — return static only
  }

  return [...staticRoutes, ...dynamicRoutes];
}
