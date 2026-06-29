import { prisma } from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Lightweight helper — no extra query when plugin is not installed
async function isVirtualTryOnEnabled(): Promise<boolean> {
  try {
    const plugin = await prisma.plugin.findUnique({
      where: { slug: 'virtual-tryon' },
      select: { isEnabled: true },
    });
    return plugin?.isEnabled ?? false;
  } catch {
    return false;
  }
}
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/server';
import ReviewSection from '@/components/ReviewSection';
import QASection from '@/components/QASection';
import ProductDetails from './ProductDetails';
import RelatedProducts from '@/components/RelatedProducts';
import RecentlyViewed from '@/components/RecentlyViewed';
import { PLATFORM_URL } from '@/lib/constants';
import type { Product as ProductType, Review, ProductQA } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      basePrice: true,
      flashSalePrice: true,
      images: { where: { isPrimary: true }, take: 1 },
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
    },
  });

  if (!product) return { title: 'Product Not Found' };

  const price = product.flashSalePrice ?? product.basePrice;
  const image = product.images[0]?.url;
  const description =
    product.description.slice(0, 155) ||
    `Shop ${product.title} from ${product.seller?.storeName} on Brandy — Egypt's local marketplace. Price: ${price} EGP.`;
  const arabicDescription = `تسوق ${product.title} من ${product.seller?.storeName} على Brandy — السوق المحلي المصري. السعر: ${price} جنيه.`;

  return {
    title: `${product.title} — ${product.seller?.storeName ?? 'Brandy'}`,
    description,
    alternates: { languages: { 'ar-EG': arabicDescription } },
    openGraph: {
      title: product.title,
      description,
      images: image ? [{ url: image, width: 800, height: 800 }] : undefined,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: product.title, description },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dict = await getDictionary();
  const t = dict;

  const baseUrl = PLATFORM_URL;

  // Run plugin check in parallel with the product query
  const session = await getServerSession(authOptions);

  const [product, virtualTryOnEnabled] = await Promise.all([
    prisma.product.findUnique({
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
    }),
    isVirtualTryOnEnabled(),
  ]);

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

  let eligibleOrderItems: { id: string }[] = [];
  let initialQuestions: any[] = [];
  if (session?.user) {
    const userId = (session.user as any).id;
    // Find DELIVERED order items for this product that haven't been reviewed yet
    [eligibleOrderItems, initialQuestions] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          order: { userId },
          variant: { productId: product.id },
          status: 'DELIVERED',
          review: null,
        },
        select: { id: true },
      }),
      prisma.productQA.findMany({
        where: { productId: product.id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  } else {
    initialQuestions = await prisma.productQA.findMany({
      where: { productId: product.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

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
        <ProductDetails
          product={product as unknown as ProductType}
          virtualTryOnEnabled={virtualTryOnEnabled}
        />

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
          eligibleOrderItems={eligibleOrderItems}
        />

        {/* Q&A Section */}
        <QASection
          productId={product.id}
          sellerId={product.seller?.id ?? ''}
          initialQuestions={initialQuestions as unknown as ProductQA[]}
        />
      </div>
    </main>
  );
}
