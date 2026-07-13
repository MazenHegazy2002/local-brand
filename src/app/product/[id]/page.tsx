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
import { getDictionary } from '@/lib/i18n/server';
import ReviewSection from '@/components/ReviewSection';
import QASection from '@/components/QASection';
import ProductDetails from './ProductDetails';
import RelatedProducts from '@/components/RelatedProducts';
import RecentlyViewed from '@/components/RecentlyViewed';
import { PLATFORM_URL } from '@/lib/constants';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/jsonld';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import type { Product as ProductType, Review, ProductQA } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      published: true,
      deletedAt: null,
    },
    select: {
      title: true,
      slug: true,
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
      url: `${PLATFORM_URL}/product/${product.slug}`,
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
    prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
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

  // Authorize viewing draft/deleted products only for admins and the owner seller
  const isDraftOrDeleted = !product.published || product.deletedAt !== null;
  if (isDraftOrDeleted) {
    const isOwner =
      session?.user &&
      ((session.user as any).role === 'ADMIN' ||
        ((session.user as any).role === 'SELLER' &&
          product.seller.userId === (session.user as any).id));
    if (!isOwner) {
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
  }

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

  const breadcrumbLd = breadcrumbJsonLd({
    items: [
      { name: t.Home, url: baseUrl },
      { name: t.Shop, url: `${baseUrl}/shop` },
      {
        name: product.category?.name ?? '',
        url: `${baseUrl}/shop?category=${product.category?.slug ?? ''}`,
      },
      { name: product.title },
    ],
  });

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />

      <Navbar />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-100 py-3">
        <div className="container mx-auto px-4">
          <Breadcrumb
            separator="/"
            className="text-xs font-semibold text-gray-500"
            items={[
              { label: t.Home, href: '/' },
              { label: t.Shop, href: '/shop' },
              {
                label: product.category?.name ?? '',
                href: product.category?.slug
                  ? `/shop?category=${product.category.slug}`
                  : undefined,
              },
              { label: product.title },
            ]}
          />
        </div>
      </nav>

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

        <QASection
          productId={product.id}
          initialQuestions={initialQuestions as unknown as ProductQA[]}
        />
      </div>
    </main>
  );
}
