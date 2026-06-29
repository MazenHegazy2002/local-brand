import Navbar from '@/components/Navbar';
import ProductCard, { ProductCardProduct } from '@/components/ProductCard';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

export const metadata = {
  title: 'Flash Sales – Brandy | Limited-Time Deals',
  description:
    "Shop limited-time flash sales and exclusive deals on Egyptian local brands. Prices drop fast — grab yours before they're gone.",
};

async function getFlashSaleProducts() {
  const now = new Date();
  const products = await prisma.product.findMany({
    where: {
      published: true,
      deletedAt: null,
      flashSalePrice: { not: null },
      flashSaleEndsAt: { gt: now },
    },
    orderBy: { flashSaleEndsAt: 'asc' },
    take: 48,
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      variants: { take: 6 },
      seller: { select: { storeName: true } },
    },
  });
  return { products, fetchedAt: now.getTime() };
}

function CountdownBadge({ remainingMs }: { remainingMs: number }) {
  if (remainingMs <= 0) return null;
  const h = Math.floor(remainingMs / 3600000);
  const m = Math.floor((remainingMs % 3600000) / 60000);
  return (
    <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
      ⏱ {h > 0 ? `${h}h ` : ''}
      {m}m left
    </span>
  );
}

export default async function FreshSalesPage() {
  const { products, fetchedAt } = await getFlashSaleProducts();

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-red-600 to-red-500 text-white py-14 px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Limited time</p>
        <h1 className="text-4xl md:text-5xl font-black mb-3">⚡ Flash Sales</h1>
        <p className="text-base md:text-lg opacity-90 max-w-md mx-auto">
          Hand-picked deals from Egypt&apos;s best local brands. Stock is limited — shop fast.
        </p>
      </section>

      <div className="container mx-auto px-4 py-10">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              No active flash sales right now
            </h2>
            <p className="text-gray-400 mb-6">Check back soon — new deals go live every day.</p>
            <a
              href="/shop"
              className="inline-block px-8 py-3 bg-[#1e3b8a] text-white rounded-full font-semibold hover:bg-[#16307a] transition-colors"
            >
              Browse All Products
            </a>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">{products.length} active deals</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {products.map((product, idx) => {
                const discountPct =
                  product.flashSalePrice && product.basePrice > 0
                    ? Math.round((1 - product.flashSalePrice / product.basePrice) * 100)
                    : 0;

                return (
                  <div key={product.id} className="relative">
                    {/* Discount badge */}
                    {discountPct > 0 && (
                      <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 pointer-events-none">
                        <span className="bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-md">
                          -{discountPct}%
                        </span>
                        {product.flashSaleEndsAt && (
                          <CountdownBadge
                            remainingMs={product.flashSaleEndsAt.getTime() - fetchedAt}
                          />
                        )}
                      </div>
                    )}
                    <ProductCard
                      product={
                        {
                          ...product,
                          name: product.title,
                          image: product.images?.[0]?.url,
                          price: product.flashSalePrice ?? product.basePrice,
                          brand: product.seller?.storeName || 'Brandy',
                          brandSlug: product.seller?.storeName
                            ? product.seller.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                            : '',
                        } as ProductCardProduct
                      }
                      index={idx}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
