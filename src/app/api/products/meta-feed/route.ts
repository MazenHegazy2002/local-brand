import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLATFORM_NAME, PLATFORM_URL } from '@/lib/constants';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { published: true, deletedAt: null },
      include: {
        seller: true,
        category: true,
        images: true,
        variants: true,
      },
    });

    const itemsXml = products
      .map(product => {
        const id = product.id;
        const title = escapeXml(product.title);
        const description = escapeXml(product.description || '');
        const link = `${PLATFORM_URL}/product/${product.id}`;

        // Find primary image or fallback to first image or placeholder
        const primaryImage =
          product.images.find(img => img.isPrimary)?.url || product.images[0]?.url;
        const imageLink = primaryImage || `${PLATFORM_URL}/placeholder.png`;

        const price = product.flashSalePrice ?? product.basePrice;
        const priceStr = `${price} EGP`;

        const brand = escapeXml(product.seller?.storeName || PLATFORM_NAME);
        const condition = 'new';

        // Determine availability based on variants stock
        const totalStock = product.variants.reduce((sum, v) => sum + v.stockCount, 0);
        const availability = totalStock > 0 ? 'in stock' : 'out of stock';
        const categoryName = product.category ? escapeXml(product.category.name) : '';

        return `
    <item>
      <g:id>${id}</g:id>
      <title>${title}</title>
      <description>${description}</description>
      <link>${link}</link>
      <g:image_link>${imageLink}</g:image_link>
      <g:condition>${condition}</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${priceStr}</g:price>
      <g:brand>${brand}</g:brand>
      ${categoryName ? `<g:google_product_category>${categoryName}</g:google_product_category>` : ''}
    </item>`;
      })
      .join('');

    const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(PLATFORM_NAME)} Meta Catalog Feed</title>
    <link>${PLATFORM_URL}</link>
    <description>${escapeXml(PLATFORM_NAME)} Product Catalog for Meta Commerce Manager / Instagram Shopping</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(xmlFeed, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[MetaFeed] Error generating feed:', err);
    return NextResponse.json({ error: 'Failed to generate Meta feed' }, { status: 500 });
  }
}
