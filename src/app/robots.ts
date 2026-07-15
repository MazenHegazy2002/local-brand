import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { PLATFORM_URL } from '@/lib/constants';

export default async function robots(): Promise<MetadataRoute.Robots> {
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
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
