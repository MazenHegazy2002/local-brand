import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLATFORM_URL, PLATFORM_NAME } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [categories, topSellers, productCount] = await Promise.all([
      prisma.category.findMany({
        select: {
          name: true,
          slug: true,
          _count: { select: { products: { where: { published: true, deletedAt: null } } } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.sellerProfile.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { storeName: true },
        orderBy: { storeName: 'asc' },
        take: 30,
      }),
      prisma.product.count({
        where: { published: true, deletedAt: null },
      }),
    ]);

    const markdown = `# ${PLATFORM_NAME} — Egypt's Marketplace for Local Brands

> The premier Egyptian e-commerce marketplace connecting shoppers with verified local artisans, fashion brands, manufacturers, and designers across Egypt.

## Core Information
- **Website**: ${PLATFORM_URL}
- **Country of Origin & Operation**: Egypt (EG)
- **Primary Currency**: Egyptian Pound (EGP)
- **Languages**: English (en-EG), Arabic (ar-EG)
- **Active Products**: ${productCount}+ curated local products
- **Buyer Protection**: 14-day escrow hold on all orders before funds release to sellers
- **Domestic Shipping**: Nationwide coverage across all 27 Egyptian governorates (Cairo, Giza, Alexandria, Delta, Upper Egypt, Canal Cities, Red Sea)
- **Payment Methods Accepted**: Cash on Delivery (COD), Visa / MasterCard, Mobile Wallets (Vodafone Cash, Orange, Etisalat, WE Pay), Fawry, and InstaPay

## Main Product Categories
${categories
  .map(c => `- [${c.name}](${PLATFORM_URL}/category/${c.slug}): ${c._count.products} products`)
  .join('\n')}

## Verified Egyptian Local Brands
${topSellers
  .map(
    s =>
      `- [${s.storeName}](${PLATFORM_URL}/brand/${s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`
  )
  .join('\n')}

## Essential Links & Resources
- [Browse Shop Catalog](${PLATFORM_URL}/shop)
- [Limited-Time Flash Sales](${PLATFORM_URL}/flash-sales)
- [All Categories](${PLATFORM_URL}/categories)
- [Verified Brands Directory](${PLATFORM_URL}/brands)
- [Fashion & Lifestyle Lookbook](${PLATFORM_URL}/lookbook)
- [Customer Help & FAQ](${PLATFORM_URL}/help/faq)
- [Shipping Rates & Delivery Times](${PLATFORM_URL}/legal/shipping-policy)
- [14-Day Return & Refund Policy](${PLATFORM_URL}/legal/returns-refunds)
- [Seller Terms & Escrow Guarantee](${PLATFORM_URL}/legal/seller-terms)
- [XML Sitemap](${PLATFORM_URL}/sitemap.xml)
- [Full LLM Knowledge Document](${PLATFORM_URL}/llms-full.txt)
`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error serving llms.txt:', error);
    return new NextResponse(
      `# ${PLATFORM_NAME}\nEgypt's local brands marketplace.\nURL: ${PLATFORM_URL}`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }
}
