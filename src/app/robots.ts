import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/product/'],
        disallow: ['/dashboard', '/seller-hub', '/admin-os', '/checkout', '/api/'],
      },
    ],
    sitemap: 'https://localbrand-egypt.com/sitemap.xml',
  };
}
