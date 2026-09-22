import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { PLATFORM_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = PLATFORM_URL;
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const proto = headersList.get('x-forwarded-proto') || 'https';
    if (host) {
      baseUrl = `${proto}://${host}`;
    }
  } catch {
    // fallback
  }

  const now = new Date();

  // Static pages — public content pages only (auth/account pages excluded)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: {
          'en-EG': baseUrl,
          'ar-EG': `${baseUrl}?lang=ar`,
        },
      },
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          'en-EG': `${baseUrl}/shop`,
          'ar-EG': `${baseUrl}/shop?lang=ar`,
        },
      },
    },
    {
      url: `${baseUrl}/flash-sales`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
      alternates: {
        languages: {
          'en-EG': `${baseUrl}/flash-sales`,
          'ar-EG': `${baseUrl}/flash-sales?lang=ar`,
        },
      },
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/brands`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/lookbook`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/llms-full.txt`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/affiliate`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
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
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/shipping-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/seller-terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/ai.txt`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Blog articles (static)
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/top-egyptian-streetwear-brands-2026`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/how-to-scale-local-brand-egypt`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/virtual-tryon-future-of-local-shopping`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
    {
      url: `${baseUrl}/blog/behind-the-craft-alexandria-leather-artisans`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Product pages (max 1000 per sitemap)
    const products = await prisma.product.findMany({
      where: { published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
      take: 1000,
    });

    const productRoutes = products.map(p => {
      const slugOrId = p.slug?.trim() || p.id;
      return {
        url: `${baseUrl}/product/${slugOrId}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        alternates: {
          languages: {
            'en-EG': `${baseUrl}/product/${slugOrId}`,
            'ar-EG': `${baseUrl}/product/${slugOrId}?lang=ar`,
          },
        },
      };
    });

    // Category pages
    const categories = await prisma.category.findMany({
      select: { slug: true },
    });

    const categoryRoutes = categories.map(c => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          'en-EG': `${baseUrl}/category/${c.slug}`,
          'ar-EG': `${baseUrl}/category/${c.slug}?lang=ar`,
        },
      },
    }));

    // Brand pages
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { storeName: true, updatedAt: true },
    });

    const brandRoutes = sellers.map(s => {
      const slug = s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return {
        url: `${baseUrl}/brand/${slug}`,
        lastModified: s.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.75,
        alternates: {
          languages: {
            'en-EG': `${baseUrl}/brand/${slug}`,
            'ar-EG': `${baseUrl}/brand/${slug}?lang=ar`,
          },
        },
      };
    });

    dynamicRoutes = [...productRoutes, ...categoryRoutes, ...brandRoutes];
  } catch {
    // DB not available during static build — return static only
  }

  return [...staticRoutes, ...dynamicRoutes];
}
