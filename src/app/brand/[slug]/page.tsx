import Navbar from '@/components/Navbar';
import ProductCard, { ProductCardProduct } from '@/components/ProductCard';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Product, ProductImage } from '@/types';
import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';
import { breadcrumbJsonLd, brandStoreJsonLd, jsonLdScript } from '@/lib/jsonld';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  let brandName = '';
  let brandDesc: string | null | undefined = '';

  try {
    // 1. Check Brand table first for multi-brand storefronts
    const brandRecord = await prisma.brand.findUnique({
      where: { slug: decodedSlug },
      select: { name: true, description: true, logoUrl: true, coverUrl: true },
    });

    brandName = brandRecord?.name || '';
    brandDesc = brandRecord?.description;

    // 2. Fallback to SellerProfile storeName
    if (!brandRecord) {
      const sellers = await prisma.sellerProfile.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { storeName: true, description: true },
      });
      const seller = sellers.find(
        s => s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === decodedSlug
      );
      if (seller) {
        brandName = seller.storeName;
        brandDesc = seller.description;
      }
    }
  } catch (err) {
    console.error('Failed to query brand metadata:', err);
  }

  if (!brandName) return { title: 'Brand Not Found' };

  const description =
    brandDesc ||
    `Shop authentic ${brandName} products on Brandy — Egypt's marketplace for local sellers. Verified Egyptian brand.`;
  const brandUrl = `${PLATFORM_URL}/brand/${slug}`;
  const ogImageUrl = `${PLATFORM_URL}/api/og?brand=${encodeURIComponent(brandName)}&title=${encodeURIComponent(brandName)}&badge=Verified+Egyptian+Brand`;

  return {
    title: `${brandName} — Egyptian Local Brand`,
    description,
    alternates: {
      canonical: brandUrl,
      languages: {
        'en-EG': brandUrl,
        'ar-EG': `${brandUrl}?lang=ar`,
        'x-default': brandUrl,
      },
    },
    openGraph: {
      title: `${brandName} — Egyptian Local Brand`,
      description,
      url: brandUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandName,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  let brandName = '';
  let brandDescription = '';
  let accentColor = '#0f6b50';
  let products: any[] = [];

  try {
    // Check Brand table first
    const brandRecord = await prisma.brand.findUnique({
      where: { slug: decodedSlug },
      include: {
        products: {
          where: { published: true, deletedAt: null },
          include: { images: true, variants: true },
        },
        seller: true,
      },
    });

    if (brandRecord && brandRecord.status === 'ACTIVE') {
      brandName = brandRecord.name;
      brandDescription = brandRecord.description || brandRecord.seller.description || '';
      accentColor = brandRecord.accentColor || '#0f6b50';
      products = brandRecord.products;
    } else {
      // Fallback to SellerProfile storeName
      const sellers = await prisma.sellerProfile.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        include: {
          products: {
            where: { published: true, deletedAt: null },
            include: { images: true, variants: true },
          },
        },
      });

      const seller = sellers.find(
        s => s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === decodedSlug
      );

      if (!seller) return notFound();

      brandName = seller.storeName;
      brandDescription = seller.description || '';
      products = seller.products;
    }
  } catch (err) {
    console.error('Failed to load brand data:', err);
    return notFound();
  }

  const brandUrl = `${PLATFORM_URL}/brand/${slug}`;
  const breadcrumbLd = breadcrumbJsonLd({
    items: [
      { name: 'Home', url: PLATFORM_URL },
      { name: 'Brands', url: `${PLATFORM_URL}/brands` },
      { name: brandName, url: brandUrl },
    ],
  });

  const brandLd = brandStoreJsonLd({
    name: brandName,
    slug,
    description: brandDescription,
    productCount: products.length,
  });

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(brandLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <Navbar />

      {/* Brand Hero Cover */}
      <div
        className="w-full h-80 relative overflow-hidden flex items-center justify-center border-b border-white/10"
        style={{ background: accentColor }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
        <div className="relative z-20 text-center container px-4">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-lg uppercase tracking-tighter">
            {brandName}
          </h1>
          <span className="bg-amber-400 text-amber-950 text-xs uppercase font-extrabold tracking-widest px-4 py-1 rounded-full shadow-sm">
            Official Egyptian Brand
          </span>
        </div>
      </div>

      <div className="container py-12 md:py-24">
        <Breadcrumb
          className="mb-8"
          separator="/"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Brands', href: '/brands' },
            { label: brandName },
          ]}
        />

        <div className="flex items-center justify-between mb-12 border-b border-gray-200 pb-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900">
              Curated <span className="text-[#0f6b50]">Collection</span>
            </h2>
            {brandDescription && <p className="text-sm text-slate-500 mt-1">{brandDescription}</p>}
          </div>
          <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">
            {products.length} Items
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🛍️</div>
            <p className="text-sm font-medium">No products listed for {brandName} yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 px-4">
            {products.map((product: Product & { images: ProductImage[] }, idx: number) => (
              <ProductCard
                key={product.id}
                product={
                  {
                    ...product,
                    name: product.title,
                    image: product.images[0]?.url || '',
                  } as ProductCardProduct
                }
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
