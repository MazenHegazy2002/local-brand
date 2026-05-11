/**
 * JSON-LD schema helpers for SEO / rich snippets.
 * Generate schema.org structured data to embed via <script type="application/ld+json">.
 */

import { PLATFORM_URL, PLATFORM_NAME } from './constants';

export interface ProductJsonLdInput {
  id: string;
  title: string;
  description: string;
  images: string[];
  brand?: string;
  price: number;
  currency?: string;
  availability: 'in-stock' | 'out-of-stock';
  sku?: string;
  aggregateRating?: { value: number; count: number };
}

export function productJsonLd(input: ProductJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${PLATFORM_URL}/product/${input.id}`,
    name: input.title,
    description: input.description,
    image: input.images,
    sku: input.sku || input.id,
    brand: input.brand ? { '@type': 'Brand', name: input.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${PLATFORM_URL}/product/${input.id}`,
      priceCurrency: input.currency || 'EGP',
      price: input.price,
      availability:
        input.availability === 'in-stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: PLATFORM_NAME },
    },
    aggregateRating: input.aggregateRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: input.aggregateRating.value,
          reviewCount: input.aggregateRating.count,
        }
      : undefined,
  };
}

export interface BreadcrumbJsonLdInput {
  items: Array<{ name: string; url?: string }>;
}

export function breadcrumbJsonLd(input: BreadcrumbJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PLATFORM_NAME,
    url: PLATFORM_URL,
    logo: `${PLATFORM_URL}/logo.png`,
    sameAs: [
      'https://www.facebook.com/brandy',
      'https://www.instagram.com/brandy',
      'https://www.twitter.com/brandy',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+20-2-1234-5678',
      contactType: 'customer service',
      areaServed: 'EG',
      availableLanguage: ['en', 'ar'],
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: PLATFORM_NAME,
    url: PLATFORM_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${PLATFORM_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface FaqJsonLdInput {
  items: Array<{ question: string; answer: string }>;
}

export function faqJsonLd(input: FaqJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: input.items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

/**
 * Inline helper to serialize JSON-LD safely (escape </script>).
 */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
