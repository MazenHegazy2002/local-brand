import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export const metadata = {
  title: 'Lookbook – Brandy | Style Inspiration',
  description:
    'Explore curated style edits and seasonal collections from Egyptian local brands. Find your look on Brandy.',
};

async function getLookbookData() {
  const [collections, featured] = await Promise.all([
    prisma.collection.findMany({
      include: {
        products: {
          where: { published: true, deletedAt: null },
          include: { images: { where: { isPrimary: true }, take: 1 } },
          take: 4,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: 6,
    }),
    prisma.product.findMany({
      where: { published: true, deletedAt: null, isFeatured: true },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: { select: { storeName: true } },
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { collections, featured };
}

export default async function LookbookPage() {
  const { collections, featured } = await getLookbookData();
  const hasCollections = collections.some(c => c.products.length > 0);

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#1e3b8a] text-white py-20 px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-60">Editorial</p>
        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">Lookbook</h1>
        <p className="text-base opacity-75 max-w-sm mx-auto">
          Curated style edits from Egypt&apos;s most creative local brands.
        </p>
      </section>

      <div className="container mx-auto px-4 py-14">
        {/* Collections */}
        {hasCollections && (
          <section className="mb-16">
            <h2 className="text-2xl font-black text-gray-800 mb-8">Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {collections
                .filter(c => c.products.length > 0)
                .map(collection => {
                  const cover = collection.imageUrl || collection.products[0]?.images?.[0]?.url;
                  return (
                    <Link
                      key={collection.id}
                      href={`/shop?collection=${collection.slug}`}
                      className="group relative overflow-hidden rounded-2xl aspect-[3/4] bg-gray-100 block"
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={collection.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3b8a]/20 to-[#1e3b8a]/5" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                          {collection.products.length} pieces
                        </p>
                        <h3 className="text-2xl font-black leading-tight">{collection.name}</h3>
                        {collection.description && (
                          <p className="text-sm opacity-75 mt-1 line-clamp-2">
                            {collection.description}
                          </p>
                        )}
                        <span className="inline-block mt-3 text-xs font-bold border border-white/50 px-3 py-1 rounded-full group-hover:bg-white group-hover:text-[#1e3b8a] transition-colors">
                          Shop collection →
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>
        )}

        {/* Featured Products editorial grid */}
        {featured.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-black text-gray-800 mb-2">Editor&apos;s Picks</h2>
            <p className="text-sm text-gray-400 mb-8">Hand-selected by our style team</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map((product, i) => {
                const img = product.images?.[0]?.url;
                // First item is large
                const isLarge = i === 0;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className={`group relative overflow-hidden rounded-xl bg-gray-100 block ${isLarge ? 'row-span-2' : ''}`}
                    style={{ aspectRatio: isLarge ? '2/3' : '1' }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={product.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {product.seller?.storeName}
                      </p>
                      <p className="text-sm font-bold line-clamp-2">{product.title}</p>
                      <p className="text-xs font-black mt-1">
                        EGP {product.basePrice.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!hasCollections && featured.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Coming Soon</h2>
            <p className="text-gray-400 mb-6">Our editorial team is curating the first looks.</p>
            <Link
              href="/shop"
              className="inline-block px-8 py-3 bg-[#1e3b8a] text-white rounded-full font-semibold hover:bg-[#16307a] transition-colors"
            >
              Browse the Shop
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
