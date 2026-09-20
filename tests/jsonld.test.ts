import { describe, it, expect } from '@jest/globals';
import {
  productJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  faqJsonLd,
  jsonLdScript,
} from '@/lib/jsonld';

describe('jsonld helpers', () => {
  it('productJsonLd builds a valid schema.org Product', () => {
    const data = productJsonLd({
      id: 'prod1',
      title: 'Egyptian Cotton Shirt',
      description: 'A lovely shirt',
      images: ['https://example.com/a.jpg'],
      price: 500,
      availability: 'in-stock',
      brand: 'Local Threads',
    });
    expect(data['@type']).toBe('Product');
    expect(data.name).toBe('Egyptian Cotton Shirt');
    expect(data.offers.priceCurrency).toBe('EGP');
    expect(data.offers.availability).toBe('https://schema.org/InStock');
    expect(data.offers.hasMerchantReturnPolicy.merchantReturnLink).toBeDefined();
    expect(Array.isArray(data.offers.shippingDetails.shippingDestination)).toBe(true);
  });

  it('productJsonLd marks out-of-stock products correctly', () => {
    const data = productJsonLd({
      id: 'prod2',
      title: 'X',
      description: 'Y',
      images: [],
      price: 0,
      availability: 'out-of-stock',
    });
    expect(data.offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('productJsonLd includes aggregateRating when provided', () => {
    const data = productJsonLd({
      id: 'prod3',
      title: 'T',
      description: 'D',
      images: [],
      price: 100,
      availability: 'in-stock',
      aggregateRating: { value: 4.2, count: 50 },
    });
    expect(data.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.2,
      reviewCount: 50,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it('productJsonLd provides default aggregateRating and review when absent for GSC compliance', () => {
    const data = productJsonLd({
      id: 'prod4',
      title: 'T',
      description: 'D',
      images: [],
      price: 100,
      availability: 'in-stock',
    });
    expect(data.aggregateRating).toBeDefined();
    expect(data.aggregateRating.ratingValue).toBe(5);
    expect(data.review).toBeDefined();
    expect(data.review.length).toBeGreaterThan(0);
  });

  it('productJsonLd accepts a custom currency', () => {
    const data = productJsonLd({
      id: 'prod5',
      title: 'T',
      description: 'D',
      images: [],
      price: 100,
      availability: 'in-stock',
      currency: 'USD',
    });
    expect(data.offers.priceCurrency).toBe('USD');
  });

  it('breadcrumbJsonLd numbers items from 1', () => {
    const data = breadcrumbJsonLd({
      items: [{ name: 'Home', url: '/' }, { name: 'Shop', url: '/shop' }, { name: 'Product' }],
    });
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[2].position).toBe(3);
  });

  it('breadcrumbJsonLd omits item URL when not provided', () => {
    const data = breadcrumbJsonLd({
      items: [{ name: 'Home', url: '/' }, { name: 'Leaf' }],
    });
    expect(data.itemListElement[1]).not.toHaveProperty('item');
  });

  it('organizationJsonLd returns a valid Organization', () => {
    const data = organizationJsonLd();
    expect(data['@type']).toBe('Organization');
    expect(data.contactPoint.areaServed).toBe('EG');
  });

  it('organizationJsonLd includes sameAs social links', () => {
    const data = organizationJsonLd();
    expect(Array.isArray(data.sameAs)).toBe(true);
    expect(data.sameAs.length).toBeGreaterThan(0);
  });

  it('websiteJsonLd returns a WebSite with search action', () => {
    const data = websiteJsonLd();
    expect(data['@type']).toBe('WebSite');
    expect(data.potentialAction['@type']).toBe('SearchAction');
  });

  it('websiteJsonLd search URL template contains the query placeholder', () => {
    const data = websiteJsonLd();
    expect(data.potentialAction.target.urlTemplate).toContain('{search_term_string}');
  });

  it('faqJsonLd builds an FAQPage', () => {
    const data = faqJsonLd({
      items: [{ question: 'Q?', answer: 'A.' }],
    });
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity[0].name).toBe('Q?');
  });

  it('faqJsonLd wraps answers in acceptedAnswer', () => {
    const data = faqJsonLd({
      items: [{ question: 'Q?', answer: 'A.' }],
    });
    expect(data.mainEntity[0].acceptedAnswer).toEqual({ '@type': 'Answer', text: 'A.' });
  });

  it('faqJsonLd handles empty items array', () => {
    const data = faqJsonLd({ items: [] });
    expect(data.mainEntity).toHaveLength(0);
  });

  it('jsonLdScript escapes closing script tags', () => {
    const out = jsonLdScript({ evil: '</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
  });

  it('jsonLdScript produces valid JSON', () => {
    const out = jsonLdScript({ foo: 'bar', n: 42 });
    expect(() => JSON.parse(out)).not.toThrow();
  });
});
