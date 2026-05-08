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

  it('breadcrumbJsonLd numbers items from 1', () => {
    const data = breadcrumbJsonLd({
      items: [
        { name: 'Home', url: '/' },
        { name: 'Shop', url: '/shop' },
        { name: 'Product' },
      ],
    });
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[2].position).toBe(3);
  });

  it('organizationJsonLd returns a valid Organization', () => {
    const data = organizationJsonLd();
    expect(data['@type']).toBe('Organization');
    expect(data.contactPoint.areaServed).toBe('EG');
  });

  it('websiteJsonLd returns a WebSite with search action', () => {
    const data = websiteJsonLd();
    expect(data['@type']).toBe('WebSite');
    expect(data.potentialAction['@type']).toBe('SearchAction');
  });

  it('faqJsonLd builds an FAQPage', () => {
    const data = faqJsonLd({
      items: [{ question: 'Q?', answer: 'A.' }],
    });
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity[0].name).toBe('Q?');
  });

  it('jsonLdScript escapes closing script tags', () => {
    const out = jsonLdScript({ evil: '</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
  });
});
