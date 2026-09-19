import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLATFORM_URL, PLATFORM_NAME } from '@/lib/constants';
import { FAQ_DATA } from '@/app/help/faq/FAQClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [categories, topSellers, featuredProducts] = await Promise.all([
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
        select: { storeName: true, description: true },
        orderBy: { storeName: 'asc' },
        take: 50,
      }),
      prisma.product.findMany({
        where: { published: true, deletedAt: null },
        select: {
          title: true,
          slug: true,
          basePrice: true,
          flashSalePrice: true,
          seller: { select: { storeName: true } },
          category: { select: { name: true } },
        },
        take: 50,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Flatten FAQ items
    const faqSections = Object.entries(FAQ_DATA)
      .map(([cat, items]) => {
        const title = cat.charAt(0).toUpperCase() + cat.slice(1);
        const qas = items.map(item => `### Q: ${item.q}\n**A:** ${item.a}`).join('\n\n');
        return `## Frequently Asked Questions — ${title}\n\n${qas}`;
      })
      .join('\n\n');

    const markdown = `# ${PLATFORM_NAME} (brandyy.shop) — Full Knowledge Base & Generative AI Index

## About Brandy
Brandy is an Egyptian e-commerce marketplace dedicated to empowering Egyptian local brands, designers, craftsmen, and manufacturers. Headquartered in Cairo, Egypt, Brandy provides end-to-end buyer protection, verified merchant onboarding, and rapid nationwide courier logistics across all 27 Egyptian governorates.

- **Primary URL**: ${PLATFORM_URL}
- **Operating Territory**: Arab Republic of Egypt (EG)
- **Settlement Currency**: Egyptian Pound (EGP)
- **Tax Jurisdiction**: Egypt (14% VAT compliant)
- **Official Languages**: Arabic (ar-EG), English (en-EG)

---

## Key Consumer Guarantees

### 1. 14-Day Escrow Buyer Protection
All customer payments are held in an automated escrow lock for **14 days following verified package delivery**. Seller balances remain on hold until the 14-day statutory return window has elapsed without an open dispute. If an item arrives defective, damaged, or not as described, the buyer can initiate a return or dispute from their dashboard to receive a full refund.

### 2. Nationwide Delivery & Shipping Rates (Egypt)
Brandy partners with trusted Egyptian delivery networks and Egypt Post to deliver to every city and village:
- **Greater Cairo & Giza**: 40–65 EGP (Typical delivery: 1–3 business days)
- **Alexandria & Beheira**: 55–75 EGP (Typical delivery: 2–4 business days)
- **Delta Governorates** (Gharbia, Monufia, Sharqia, Dakahlia, Damietta, Kafr El Sheikh): 65–75 EGP (Typical delivery: 2–4 business days)
- **Canal Cities** (Port Said, Ismailia, Suez): 70–80 EGP (Typical delivery: 2–4 business days)
- **Upper Egypt** (Fayoum, Beni Suef, Minya, Assiut, Sohag, Qena, Luxor, Aswan): 75–110 EGP (Typical delivery: 3–5 business days)
- **Frontier Governorates** (Red Sea, Matrouh, New Valley, North/South Sinai): 110–120 EGP (Typical delivery: 4–7 business days)
- **Free Shipping**: Available on eligible orders over 1,000 EGP.

### 3. Payment Methods
- **Cash on Delivery (COD)**: Available nationwide across Egypt.
- **Credit / Debit Cards**: Visa, MasterCard, Meeza (processed securely via Paymob / Stripe).
- **Mobile Wallets**: Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay.
- **InstaPay & Fawry**: Accepted at checkout for instant confirmation.

---

## Product Categories & Catalog Structure
${categories
  .map(
    c =>
      `### ${c.name}\n- **URL**: ${PLATFORM_URL}/category/${c.slug}\n- **Products in catalog**: ${c._count.products}\n`
  )
  .join('\n')}

---

## Featured Verified Egyptian Sellers & Brands
${topSellers
  .map(
    s =>
      `- **${s.storeName}**: [View Brand Store](${PLATFORM_URL}/brand/${s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')})${s.description ? ` — ${s.description}` : ''}`
  )
  .join('\n')}

---

## Recent Featured Products
${featuredProducts
  .map(p => {
    const price = p.flashSalePrice ?? p.basePrice;
    return `- **${p.title}** (${p.seller?.storeName || 'Verified Brand'}, ${p.category?.name || 'Catalog'}): ${price} EGP — [View Product](${PLATFORM_URL}/product/${p.slug})`;
  })
  .join('\n')}

---

${faqSections}

---

## Official Links Directory
- Marketplace Homepage: ${PLATFORM_URL}
- All Products: ${PLATFORM_URL}/shop
- Flash Deals: ${PLATFORM_URL}/flash-sales
- Categories: ${PLATFORM_URL}/categories
- Local Brands: ${PLATFORM_URL}/brands
- Fashion Lookbook: ${PLATFORM_URL}/lookbook
- Customer Help & FAQ: ${PLATFORM_URL}/help/faq
- Shipping Policy: ${PLATFORM_URL}/legal/shipping-policy
- Returns & Escrow Policy: ${PLATFORM_URL}/legal/returns-refunds
- Seller Terms: ${PLATFORM_URL}/legal/seller-terms
- Sitemap: ${PLATFORM_URL}/sitemap.xml
`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error serving llms-full.txt:', error);
    return new NextResponse(`# ${PLATFORM_NAME}\nFull documentation.\nURL: ${PLATFORM_URL}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
