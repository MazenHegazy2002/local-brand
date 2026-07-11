import Navbar from '@/components/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { Category, Product, ProductImage } from '@/types';
import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/jsonld';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, _count: { select: { products: true } } },
  });
  if (!category) return { title: 'Category Not Found' };

  const en = `Shop ${category.name} from Egyptian local sellers on Brandy. ${category._count.products} products available.`;
  const ar = `تسوق ${category.name} من البائعين المحليين المصريين على Brandy.`;

  return {
    title: `${category.name} — Brandy`,
    description: en,
    alternates: { languages: { 'ar-EG': ar } },
    openGraph: { title: `${category.name} — Brandy`, description: en },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { published: true },
        include: { images: true, category: true },
        take: 60,
      },
      children: true,
    },
  });

  if (!category) {
    return (
      <main className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">
            Category Not Found
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-8">
            The category you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/categories"
            className="inline-block bg-[hsl(var(--primary))] text-white px-6 py-3 rounded-lg font-bold hover:bg-[hsl(var(--primary-dark))] transition-colors"
          >
            View All Categories
          </Link>
        </div>
      </main>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} — Brandy`,
    description: `Shop ${category.name} from Egyptian local sellers on Brandy.`,
    url: `${PLATFORM_URL}/category/${category.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.products.length,
      itemListElement: category.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${PLATFORM_URL}/product/${product.id}`,
      })),
    },
  };

  const breadcrumbLd = breadcrumbJsonLd({
    items: [
      { name: 'Home', url: PLATFORM_URL },
      { name: 'Categories', url: `${PLATFORM_URL}/categories` },
      { name: category.name, url: `${PLATFORM_URL}/category/${category.slug}` },
    ],
  });

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }}
      />
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumb
          className="mb-6"
          separator="/"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Categories', href: '/categories' },
            { label: category.name },
          ]}
        />

        <h1 className="text-3xl md:text-4xl font-black text-[hsl(var(--foreground))] mb-2">
          {category.name}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          {category.products.length} {category.products.length === 1 ? 'product' : 'products'} found
        </p>

        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4">Subcategories</h2>
            <div className="flex flex-wrap gap-2">
              {category.children.map((child: Category) => (
                <Link
                  key={child.id}
                  href={`/category/${child.slug}`}
                  className="px-4 py-2 bg-white border border-[hsl(var(--border))] rounded-full text-sm hover:bg-[hsl(var(--primary)/0.05)] hover:border-[hsl(var(--primary))] transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <Suspense fallback={<ProductGridSkeleton count={category.products.length || 12} />}>
          {category.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {category.products.map((product: Product & { images: ProductImage[] }) => (
                <Link key={product.id} href={`/product/${product.id}`} className="group">
                  <div className="bg-white rounded-xl border border-[hsl(var(--border))] overflow-hidden hover:shadow-md hover:border-[hsl(var(--primary))] transition-all">
                    <div className="aspect-square relative overflow-hidden bg-[hsl(var(--muted))]">
                      <Image
                        src={
                          product.images[0]?.url ||
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400'
                        }
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold uppercase tracking-wide mb-0.5">
                        {category.name}
                      </p>
                      <h3 className="font-bold text-[hsl(var(--foreground))] text-sm mb-2 leading-tight line-clamp-2">
                        {product.title}
                      </h3>
                      <p className="font-black text-[hsl(var(--primary))] text-sm">
                        {product.basePrice?.toLocaleString()} EGP
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-[hsl(var(--foreground))] text-lg mb-2">
                No products in this category yet
              </p>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                Check back later or explore other categories
              </p>
            </div>
          )}
        </Suspense>
      </div>
    </main>
  );
}
