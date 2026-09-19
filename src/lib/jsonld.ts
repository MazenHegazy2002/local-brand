/**
 * JSON-LD schema helpers for SEO / rich snippets.
 * Generate schema.org structured data to embed via <script type="application/ld+json">.
 * Tailored for Egyptian local e-commerce rich results & Generative Engine Optimization (GEO).
 */

import { PLATFORM_URL, PLATFORM_NAME, CONTACT_PHONE, SUPPORT_EMAIL } from './constants';

export interface ProductJsonLdInput {
  id: string;
  title: string;
  description: string;
  images: string[];
  brand?: string;
  category?: string;
  price: number;
  currency?: string;
  availability: 'in-stock' | 'out-of-stock';
  sku?: string;
  aggregateRating?: { value: number; count: number };
}

export function productJsonLd(input: ProductJsonLdInput) {
  // Google rich snippets require absolute http(s) URLs for images.
  // If images are base64 data URLs or relative, map them to absolute platform URLs or dynamic OG.
  const sanitizedImages = input.images
    .map(img => {
      if (!img) return null;
      if (img.startsWith('http://') || img.startsWith('https://')) return img;
      if (img.startsWith('/')) return `${PLATFORM_URL}${img}`;
      // For base64 or other data URIs, fallback to dynamic OG image
      return `${PLATFORM_URL}/api/og?title=${encodeURIComponent(input.title)}&price=${input.price}&brand=${encodeURIComponent(input.brand || 'Brandy')}`;
    })
    .filter(Boolean) as string[];

  const defaultImage = `${PLATFORM_URL}/api/og?title=${encodeURIComponent(input.title)}&price=${input.price}&brand=${encodeURIComponent(input.brand || 'Brandy')}`;
  const images = sanitizedImages.length > 0 ? sanitizedImages : [defaultImage];

  // Price valid until next year
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${PLATFORM_URL}/product/${input.id}`,
    name: input.title,
    description: input.description,
    image: images,
    sku: input.sku || input.id,
    category: input.category,
    brand: input.brand ? { '@type': 'Brand', name: input.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${PLATFORM_URL}/product/${input.id}`,
      priceCurrency: input.currency || 'EGP',
      price: input.price,
      priceValidUntil: validUntil,
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        input.availability === 'in-stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: input.brand || PLATFORM_NAME,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'EG',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 40,
          currency: 'EGP',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'EG',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'd',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 4,
            unitCode: 'd',
          },
        },
      },
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
    additionalType: 'https://schema.org/OnlineStore',
    '@id': `${PLATFORM_URL}#organization`,
    name: PLATFORM_NAME,
    url: PLATFORM_URL,
    logo: `${PLATFORM_URL}/logo.png`,
    description:
      "Brandy is Egypt's leading marketplace for authentic local Egyptian brands, designers, and artisans with nationwide shipping and 14-day escrow protection.",
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo Governorate',
      addressCountry: 'EG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 30.0444,
      longitude: 31.2357,
    },
    currenciesAccepted: 'EGP',
    paymentAccepted:
      'Cash on Delivery, Credit Card, Debit Card, Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, Fawry, InstaPay',
    priceRange: 'EGP',
    sameAs: [
      'https://www.facebook.com/brandy.egypt',
      'https://www.instagram.com/brandy.egypt',
      'https://www.tiktok.com/@brandy.egypt',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: CONTACT_PHONE,
      email: SUPPORT_EMAIL,
      contactType: 'customer service',
      areaServed: 'EG',
      availableLanguage: ['en', 'ar'],
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'EG',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
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
        urlTemplate: `${PLATFORM_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface BrandStoreJsonLdInput {
  name: string;
  slug: string;
  description?: string | null;
  bio?: string | null;
  logoUrl?: string | null;
  productCount?: number;
}

export function brandStoreJsonLd(input: BrandStoreJsonLdInput) {
  const brandUrl = `${PLATFORM_URL}/brand/${input.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': brandUrl,
    name: input.name,
    url: brandUrl,
    description:
      input.description ||
      input.bio ||
      `Shop authentic ${input.name} products directly from local Egyptian sellers on Brandy.`,
    image: input.logoUrl
      ? input.logoUrl.startsWith('http')
        ? input.logoUrl
        : `${PLATFORM_URL}${input.logoUrl}`
      : `${PLATFORM_URL}/api/og?brand=${encodeURIComponent(input.name)}`,
    parentOrganization: {
      '@type': 'Organization',
      name: PLATFORM_NAME,
      url: PLATFORM_URL,
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EG',
    },
    currenciesAccepted: 'EGP',
    paymentAccepted: 'Cash on Delivery, Credit Card, Mobile Wallets, InstaPay, Fawry',
  };
}

export interface CategoryCollectionJsonLdInput {
  name: string;
  slug: string;
  description?: string;
  products: Array<{ name: string; url: string; image?: string; price?: number }>;
}

export function categoryCollectionJsonLd(input: CategoryCollectionJsonLdInput) {
  const categoryUrl = `${PLATFORM_URL}/category/${input.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': categoryUrl,
    name: input.name,
    url: categoryUrl,
    description: input.description,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.products.slice(0, 30).map((p, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: p.name,
        url: p.url,
        ...(p.image
          ? { image: p.image.startsWith('http') ? p.image : `${PLATFORM_URL}${p.image}` }
          : {}),
      })),
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
    mainEntity: input.items.map(i => ({
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
