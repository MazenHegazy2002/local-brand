import Navbar from '@/components/Navbar';
import ProductCard, { ProductCardProduct } from '@/components/ProductCard';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/client';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';
import { breadcrumbJsonLd, brandStoreJsonLd, jsonLdScript } from '@/lib/jsonld';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const dynamic = 'force-dynamic';

async function resolveBrandOrSeller(slug: string) {
  const decodedSlug = decodeURIComponent(slug).toLowerCase().trim();
  const cleanName = decodedSlug.replace(/-/g, ' ');

  // 1. Check Brand table first
  let brandRecord = await prisma.brand.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [
        { slug: decodedSlug },
        { name: { equals: cleanName, mode: 'insensitive' as const } },
        { name: { equals: decodedSlug, mode: 'insensitive' as const } },
      ],
    },
    include: {
      seller: {
        select: {
          id: true,
          storeName: true,
          description: true,
          logoUrl: true,
        },
      },
    },
  });

  // 2. Fallback to SellerProfile
  let sellerRecord = null;
  if (!brandRecord) {
    sellerRecord = await prisma.sellerProfile.findFirst({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { storeName: { equals: decodedSlug, mode: 'insensitive' as const } },
          { storeName: { equals: cleanName, mode: 'insensitive' as const } },
        ],
      },
      select: {
        id: true,
        storeName: true,
        description: true,
        logoUrl: true,
      },
    });

    if (!sellerRecord) {
      const activeSellers = await prisma.sellerProfile.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true, storeName: true, description: true, logoUrl: true },
      });
      sellerRecord =
        activeSellers.find(
          s => s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === decodedSlug
        ) || null;
    }
  }

  const brandName = brandRecord?.name || sellerRecord?.storeName || '';
  const brandDescription =
    brandRecord?.description || brandRecord?.seller?.description || sellerRecord?.description || '';
  const logoUrl = brandRecord?.logoUrl || sellerRecord?.logoUrl || null;
  const accentColor = brandRecord?.accentColor || '#1e3b8a';
  const sellerId = brandRecord?.sellerId || sellerRecord?.id;
  const brandId = brandRecord?.id;

  return {
    brandRecord,
    sellerRecord,
    brandName,
    brandDescription,
    logoUrl,
    accentColor,
    sellerId,
    brandId,
    decodedSlug,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brandData = await resolveBrandOrSeller(slug);

  if (!brandData.brandName) return { title: 'Brand Not Found' };

  const { brandName, brandDescription, logoUrl } = brandData;
  const description =
    brandDescription ||
    `Shop authentic ${brandName} products on Brandy — Egypt's marketplace for local sellers. Verified Egyptian brand.`;
  const brandUrl = `${PLATFORM_URL}/brand/${slug}`;
  const ogImageUrl =
    logoUrl ||
    `${PLATFORM_URL}/api/og?brand=${encodeURIComponent(brandName)}&title=${encodeURIComponent(brandName)}&badge=Verified+Egyptian+Brand`;

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
  const brandData = await resolveBrandOrSeller(slug);

  if (!brandData.brandName) {
    return notFound();
  }

  const { brandName, brandDescription, accentColor, sellerId, brandId, logoUrl } = brandData;

  const orConditions: Prisma.ProductWhereInput[] = [];
  if (brandId) orConditions.push({ brandId });
  if (sellerId) orConditions.push({ sellerId });
  if (brandName) orConditions.push({ brand: { equals: brandName, mode: 'insensitive' } });

  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        OR: orConditions.length > 0 ? orConditions : undefined,
      },
      include: {
        images: true,
        variants: true,
        seller: { select: { storeName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('Failed to load brand products:', err);
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

  const initial = brandName.slice(0, 1).toUpperCase();

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
        className="w-full relative overflow-hidden flex items-center justify-center border-b border-white/10 py-16 px-4"
        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #0f172a 100%)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10 pointer-events-none" />
        <div className="relative z-20 text-center container max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-white/20 mb-5 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-xl overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-white font-serif">{initial}</span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-black text-white mb-3 drop-shadow-md uppercase tracking-tight">
            {brandName}
          </h1>
          <span className="bg-amber-400 text-amber-950 text-xs uppercase font-extrabold tracking-widest px-4 py-1 rounded-full shadow-md">
            Official Egyptian Brand
          </span>
          {brandDescription && (
            <p className="text-white/80 text-sm md:text-base max-w-2xl mt-4 leading-relaxed font-medium">
              {brandDescription}
            </p>
          )}
        </div>
      </div>

      <div className="container py-10 md:py-16">
        <Breadcrumb
          className="mb-8"
          separator="/"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Brands', href: '/brands' },
            { label: brandName },
          ]}
        />

        <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
              Brand <span className="text-[#1e3b8a] dark:text-[#6b8ff5]">Collection</span>
            </h2>
          </div>
          <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">
            {products.length} Products
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-4">🛍️</div>
            <p className="text-base font-medium">No products listed for {brandName} yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any, idx: number) => (
              <ProductCard
                key={product.id}
                product={
                  {
                    ...product,
                    name: product.title,
                    image: product.images[0]?.url || '',
                    brand: brandName,
                    brandSlug: slug,
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
