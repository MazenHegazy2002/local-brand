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
import { productJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/jsonld';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { sanitizeProduct } from '@/lib/sanitize-product';
import type { Product as ProductType, Review, ProductQA } from '@/types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!id) return { title: 'Product Details | Brandy' };

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

    if (!product) return { title: 'Product Not Found | Brandy' };

    const price = product.flashSalePrice ?? product.basePrice ?? 0;
    const description =
      (product.description || '').slice(0, 155) ||
      `Shop ${product.title} from ${product.seller?.storeName || 'Brandy Store'} on Brandy — Egypt's local marketplace. Price: ${price} EGP.`;

    const productUrl = `${PLATFORM_URL}/product/${product.slug || id}`;
    const ogImageUrl = `${PLATFORM_URL}/api/og?title=${encodeURIComponent(product.title || '')}&price=${price}&brand=${encodeURIComponent(product.seller?.storeName || '')}&category=${encodeURIComponent(product.category?.name || '')}`;

    return {
      title: product.seller?.storeName
        ? `${product.title} — ${product.seller.storeName}`
        : product.title || 'Product Details',
      description,
      alternates: {
        canonical: productUrl,
        languages: {
          'en-EG': productUrl,
          'ar-EG': `${productUrl}?lang=ar`,
          'x-default': productUrl,
        },
      },
      openGraph: {
        title: product.title,
        description,
        url: productUrl,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: product.title,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: product.title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (err) {
    console.error('[generateMetadata] error:', err);
    return {
      title: 'Product Details | Brandy',
      description: 'Shop verified local Egyptian products on Brandy.',
    };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const dict = await getDictionary();
    const t = dict;

    const baseUrl = PLATFORM_URL;

    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }

    const [rawProduct, virtualTryOnEnabled] = await Promise.all([
      prisma.product
        .findFirst({
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
        })
        .catch(err => {
          console.error('[ProductPage] product query error:', err);
          return null;
        }),
      isVirtualTryOnEnabled().catch(() => false),
    ]);

    const product = rawProduct ? sanitizeProduct(rawProduct) : null;

    if (!product) {
      return (
        <main className="min-h-screen bg-[#f9f8f6]">
          <Navbar />
          <div className="container mx-auto px-4 py-32 text-center text-gray-500">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t.ProductNotFound || 'Product Not Found'}
            </h1>
            <p>{t.ProductNotFoundDesc || "This product couldn't be found."}</p>
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
            product.seller?.userId === (session.user as any).id));
      if (!isOwner) {
        return (
          <main className="min-h-screen bg-[#f9f8f6]">
            <Navbar />
            <div className="container mx-auto px-4 py-32 text-center text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {t.ProductNotFound || 'Product Not Found'}
              </h1>
              <p>{t.ProductNotFoundDesc || "This product couldn't be found."}</p>
            </div>
          </main>
        );
      }
    }

    const reviews = product.reviews || [];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length
        : 0;

    let eligibleOrderItems: { id: string }[] = [];
    let initialQuestions: any[] = [];
    try {
      if (session?.user) {
        const userId = (session.user as any).id;
        // Find DELIVERED order items for this product that haven't been reviewed yet
        [eligibleOrderItems, initialQuestions] = await Promise.all([
          prisma.orderItem
            .findMany({
              where: {
                order: { userId },
                variant: { productId: product.id },
                status: 'DELIVERED',
                review: null,
              },
              select: { id: true },
            })
            .catch(() => []),
          prisma.productQA
            .findMany({
              where: { productId: product.id },
              include: { user: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
            })
            .catch(() => []),
        ]);
      } else {
        initialQuestions = await prisma.productQA
          .findMany({
            where: { productId: product.id },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          })
          .catch(() => []);
      }
    } catch {
      eligibleOrderItems = [];
      initialQuestions = [];
    }

    const jsonLd = productJsonLd({
      id: product.slug?.trim() || product.id,
      title: product.title,
      description: product.description,
      images: product.images.map(img => img.url),
      brand: product.seller?.storeName,
      category: product.category?.name,
      price: product.flashSalePrice || product.basePrice,
      availability: product.variants.some(v => v.stockCount > 0) ? 'in-stock' : 'out-of-stock',
      aggregateRating:
        product.reviews.length > 0
          ? {
              value: avgRating,
              count: product.reviews.length,
            }
          : undefined,
      reviews: product.reviews.map(r => ({
        author: r.user?.name || 'Verified Buyer',
        rating: r.rating,
        body: r.comment || '',
        datePublished:
          r.createdAt instanceof Date ? r.createdAt.toISOString().split('T')[0] : undefined,
      })),
    });

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
  } catch (criticalErr) {
    console.error('[ProductPage] Unexpected SSR Error:', criticalErr);
    return (
      <main className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Unavailable</h1>
          <p>
            This product couldn&apos;t be loaded right now. Please try again or explore other items
            in our shop.
          </p>
          <div className="mt-6">
            <a
              href="/shop"
              className="inline-block px-6 py-3 rounded-xl bg-[#1e3b8a] text-white font-bold hover:bg-[#152c6e] transition-colors"
            >
              Browse Shop
            </a>
          </div>
        </div>
      </main>
    );
  }
}
