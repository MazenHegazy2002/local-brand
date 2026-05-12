import { prisma } from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/server';
import ReviewSection from '@/components/ReviewSection';
import ProductDetails from './ProductDetails';
import RelatedProducts from '@/components/RelatedProducts';
import RecentlyViewed from '@/components/RecentlyViewed';
import { PLATFORM_URL } from '@/lib/constants';
import type { Product as ProductType, Review } from '@/types';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dict = await getDictionary();
  const t = dict;

  const baseUrl = PLATFORM_URL;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: true,
      variants: true,
      seller: true,
      category: true,
      tags: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.ProductNotFound}</h1>
          <p>{t.ProductNotFoundDesc}</p>
        </div>
      </main>
    );
  }

  const primaryImage =
    product.images.find(i => i.isPrimary)?.url || product.images[0]?.url || '/placeholder.png';
  const stockCount = product.variants.reduce((acc, v) => acc + v.stockCount, 0);
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
      : 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map(img => img.url),
    brand: { '@type': 'Brand', name: product.seller?.storeName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EGP',
      price: product.flashSalePrice || product.basePrice,
      availability: product.variants.some(v => v.stockCount > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Brandy' },
    },
    aggregateRating:
      product.reviews.length > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: avgRating,
            reviewCount: product.reviews.length,
          }
        : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category?.name,
        item: `${baseUrl}/shop?category=${product.category?.slug}`,
      },
      { '@type': 'ListItem', position: 3, name: product.title },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-3">
        <div className="container mx-auto px-4 text-xs font-semibold text-gray-500 flex items-center gap-2">
          <span>{t.Home}</span>
          <span>/</span>
          <span>{t.Shop}</span>
          <span>/</span>
          <span className="text-[#1e3b8a]">{product.category?.name}</span>
          <span>/</span>
          <span className="text-gray-900 truncate max-w-[200px]">{product.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 lg:gap-16">
          {/* Images */}
          <div className="w-full md:w-1/2">
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-4 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
            </div>
            {/* Thumbnails */}
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <div
                  key={i}
                  className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-200 p-1 cursor-pointer overflow-hidden"
                >
                  <img src={img.url} className="w-full h-full object-cover rounded" alt="" />
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <Link
              href={`/shop?q=${encodeURIComponent(product.seller.storeName)}`}
              className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 hover:text-[#1e3b8a] transition-colors"
            >
              {product.seller.storeName}
            </Link>
            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-4">
              {product.title}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="text-3xl font-black text-[#1e3b8a]">
                {product.basePrice.toLocaleString()} {t.EGP}
              </div>
              <div className="flex bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                ✓ {t.InStock} ({stockCount} {t.Left})
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>

            {/* Product codes — only render the row if at least one variant
                actually has a SKU or UPC, so we don't add visual noise to
                products that don't carry inventory codes. */}
            {(product.variants.some(v => v.sku) || product.variants.some(v => v.upc)) && (
              <div className="mb-8 text-[11px] text-gray-400 font-mono flex flex-wrap gap-x-4 gap-y-1">
                {product.variants[0]?.sku && <span>SKU: {product.variants[0].sku}</span>}
                {product.variants[0]?.upc && <span>UPC: {product.variants[0].upc}</span>}
              </div>
            )}

            <div className="h-px w-full bg-gray-100 mb-8" />

            <ProductDetails product={product as unknown as ProductType} />

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {product.tags.map(tag => (
                <span
                  key={tag.id}
                  className="text-xs font-semibold text-gray-500 border border-gray-200 bg-white px-3 py-1 rounded-full"
                >
                  #{tag.name}
                </span>
              ))}
            </div>

            {/* Guarantee */}
            <div className="mt-10 bg-gray-50 border border-gray-100 rounded-xl p-4 flex gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#eef3f7] text-[#1e3b8a] rounded-full flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{t.BrandyGuarantee}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{t.GuaranteeText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts
          productId={product.id}
          heading="You may also like"
          type="similar"
          limit={6}
        />

        {/* Recently Viewed */}
        <RecentlyViewed trackId={product.id} excludeId={product.id} limit={6} />

        {/* Reviews Section */}
        <ReviewSection
          productId={product.id}
          initialReviews={product.reviews as unknown as Review[]}
        />
      </div>
    </main>
  );
}
