import { MetadataRoute } from 'next';
import { PLATFORM_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/admin-os/',
          '/dashboard/',
          '/dashboard/*',
          '/seller-hub/',
          '/seller-hub/*',
          '/checkout',
          '/payment/',
          '/account/',
        ],
      },
    ],
    sitemap: `${PLATFORM_URL}/sitemap.xml`,
    host: PLATFORM_URL,
  };
}
