import type { Metadata } from 'next';
import ShopPage from './ShopClient';
import { prisma } from '@/lib/prisma';
import { shopCatalogJsonLd, jsonLdScript } from '@/lib/jsonld';
import { PLATFORM_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Shop — All Products',
  description:
    'Browse thousands of products from verified Egyptian local sellers on Brandy. Filter by category, price, brand, and more. Fast delivery across Egypt.',
  openGraph: {
    title: 'Shop — All Products',
    description: 'Browse thousands of products from verified Egyptian local sellers on Brandy.',
    type: 'website',
  },
};

export default async function Page() {
  let catalogLd: ReturnType<typeof shopCatalogJsonLd> | null = null;
  try {
    const products = await prisma.product.findMany({
      where: { published: true, deletedAt: null },
      select: {
        title: true,
        slug: true,
        basePrice: true,
        flashSalePrice: true,
        seller: { select: { storeName: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    catalogLd = shopCatalogJsonLd({
      products: products.map(p => ({
        name: p.title,
        url: `${PLATFORM_URL}/product/${p.slug}`,
        price: Number(p.flashSalePrice ?? p.basePrice),
        brand: p.seller?.storeName,
        image: p.images[0]?.url,
      })),
    });
  } catch {
    // DB unavailable — render without structured data
  }

  return (
    <>
      {catalogLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(catalogLd) }}
        />
      )}
      <ShopPage />
    </>
  );
}
