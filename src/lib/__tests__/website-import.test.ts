/**
 * @jest-environment node
 */
import {
  htmlToText,
  mapShopify,
  mapWoo,
  normalizeSiteUrl,
  parseProductPage,
  sitemapLocs,
} from '@/lib/website-import';

describe('website-import parsers', () => {
  it('maps Shopify products.json', () => {
    const [p] = mapShopify(
      [
        {
          title: 'Rose Splash',
          body_html: '<p>Fresh &amp; floral</p>',
          handle: 'rose',
          images: [{ src: '//cdn.shop.com/rose.jpg' }],
          options: [
            { name: 'Size', values: ['250 ml', '500 ml'] },
            { name: 'Color', values: ['Pink'] },
          ],
          variants: [{ price: '300.00', sku: 'R1' }, { price: '250.00' }],
        },
      ],
      'https://shop.com'
    );
    expect(p).toMatchObject({
      title: 'Rose Splash',
      description: 'Fresh & floral',
      price: 250,
      images: ['https://cdn.shop.com/rose.jpg'],
      sizes: ['250 ml', '500 ml'],
      colors: ['Pink'],
      sku: 'R1',
      sourceUrl: 'https://shop.com/products/rose',
    });
  });

  it('maps WooCommerce Store API prices from minor units', () => {
    const [p] = mapWoo(
      [
        {
          name: 'Oud &#8211; 250ml',
          description: '<p>Warm</p>',
          prices: { price: '45000', currency_code: 'EGP', currency_minor_unit: 2 },
          images: [{ src: 'https://w.com/oud.png' }],
          attributes: [{ name: 'المقاس', terms: [{ name: 'L' }] }],
        },
      ],
      'https://w.com'
    );
    expect(p).toMatchObject({ title: 'Oud – 250ml', price: 450, currency: 'EGP', sizes: ['L'] });
  });

  it('reads JSON-LD Product (inside @graph) from a page', () => {
    const html = `<html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"x"},
       {"@type":"Product","name":"Linen Shirt","description":"Light","image":["/a.jpg"],
        "sku":"LS1","offers":{"@type":"Offer","price":"799","priceCurrency":"EGP"}}]}
    </script></head></html>`;
    const [p] = parseProductPage(html, 'https://brand.eg/p/shirt');
    expect(p).toMatchObject({
      title: 'Linen Shirt',
      price: 799,
      currency: 'EGP',
      images: ['https://brand.eg/a.jpg'],
      sku: 'LS1',
    });
  });

  it('falls back to Open Graph product tags', () => {
    const html = `<meta property="og:type" content="product" />
      <meta property="og:title" content="Bag" />
      <meta property="og:image" content="https://x.com/bag.jpg" />
      <meta property="product:price:amount" content="1,200.00" />`;
    expect(parseProductPage(html, 'https://x.com/bag')[0]).toMatchObject({
      title: 'Bag',
      price: 1200,
      images: ['https://x.com/bag.jpg'],
    });
  });

  it('reads sitemap locations', () => {
    expect(
      sitemapLocs(
        '<urlset><url><loc>https://a.com/products/x</loc></url><url><loc><![CDATA[https://a.com/y]]></loc></url></urlset>'
      )
    ).toEqual(['https://a.com/products/x', 'https://a.com/y']);
  });

  it('cleans HTML into text', () => {
    expect(htmlToText('<p>One</p><script>bad()</script><p>Two&nbsp;x</p>')).toBe('One\nTwo x');
  });

  it('normalizes links and rejects non-http', () => {
    expect(normalizeSiteUrl('myshop.com').toString()).toBe('https://myshop.com/');
    expect(() => normalizeSiteUrl('ftp://x.com')).toThrow();
  });
});
