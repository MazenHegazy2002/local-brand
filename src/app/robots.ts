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

  const disallowedPaths = [
    '/api/',
    '/admin/',
    '/admin-os/',
    '/admin-os/*',
    '/dashboard/',
    '/dashboard/*',
    '/seller-hub/',
    '/seller-hub/*',
    '/checkout',
    '/checkout/*',
    '/payment/',
    '/payment/*',
    '/account/',
    '/account/*',
  ];

  return {
    rules: [
      // Standard search engine web crawlers
      {
        userAgent: '*',
        allow: ['/', '/api/og', '/llms.txt', '/llms-full.txt'],
        disallow: disallowedPaths,
      },
      // Generative AI Search Bots (ChatGPT / SearchGPT, Perplexity, Anthropic, Apple Intelligence, Google Gemini)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'OAI-SearchBot',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'GoogleOther',
          'Applebot',
          'Applebot-Extended',
          'cohere-ai',
          'Amazonbot',
          'Bingbot',
        ],
        allow: [
          '/',
          '/shop',
          '/product/*',
          '/category/*',
          '/brand/*',
          '/brands',
          '/categories',
          '/flash-sales',
          '/lookbook',
          '/help/*',
          '/legal/*',
          '/llms.txt',
          '/llms-full.txt',
          '/api/og',
        ],
        disallow: disallowedPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
