import Navbar from '@/components/Navbar';
import ProductCard, { ProductCardProduct } from '@/components/ProductCard';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Product, ProductImage } from '@/types';
import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/jsonld';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  const sellers = await prisma.sellerProfile.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { storeName: true },
  });

  const seller = sellers.find(
    s => s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === decodedSlug
  );

  if (!seller) return { title: 'Brand Not Found' };

  const description = `Shop ${seller.storeName} products on Brandy — Egypt's marketplace for local sellers. Authentic Egyptian brand.`;

  return {
    title: seller.storeName,
    description,
    openGraph: {
      title: seller.storeName,
      description,
      type: 'website',
    },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

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

  const brandUrl = `${PLATFORM_URL}/brand/${slug}`;
  const breadcrumbLd = breadcrumbJsonLd({
    items: [
      { name: 'Home', url: PLATFORM_URL },
      { name: 'Brands', url: `${PLATFORM_URL}/brands` },
      { name: seller.storeName, url: brandUrl },
    ],
  });

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <Navbar />

      {/* Brand Hero Cover */}
      <div className="w-full h-80 bg-[hsl(var(--primary))] relative overflow-hidden flex items-center justify-center border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
        <div className="relative z-20 text-center container px-4">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-lg uppercase tracking-tighter">
            {seller.storeName}
          </h1>
          <span className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))] text-xs uppercase font-bold tracking-widest px-4 py-1 rounded-full">
            Official Partner
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
            { label: seller.storeName },
          ]}
        />

        <div className="flex items-center justify-between mb-12 border-b border-gray-200 pb-6">
          <h2 className="text-3xl font-serif font-bold text-gray-900">
            Curated <span className="text-[#1e3b8a]">Collection</span>
          </h2>
          <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">
            {seller.products.length} Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 px-4">
          {seller.products.map((product: Product & { images: ProductImage[] }, idx: number) => (
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
      </div>
    </main>
  );
}
