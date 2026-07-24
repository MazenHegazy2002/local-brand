import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

export const metadata = {
  title: 'Lookbook – Style Inspiration',
  description:
    'Step into our editorial fashion catalog. Explore curated seasonal aesthetics and shop local Egyptian designers.',
};

async function getLookbookProducts() {
  try {
    return await prisma.product.findMany({
      where: { published: true, deletedAt: null },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: { select: { storeName: true } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('Failed to load lookbook products:', err);
    return [];
  }
}

export default async function LookbookPage() {
  const products = await getLookbookProducts();

  // Define curated aesthetic spreads
  const spreads = [
    {
      id: 'summer-linen',
      tag: 'COLLECTION 01',
      title: 'Desert Linen Whispers',
      subtitle:
        'Effortless breathing fabrics crafted for warm Mediterranean nights and sunny afternoons.',
      heroImage:
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
      colorTheme: 'bg-[#F7F5F0] text-[#2C2A29]',
      accentColor: 'border-[#2C2A29] text-[#2C2A29] hover:bg-[#2C2A29] hover:text-[#F7F5F0]',
      items: products.slice(0, 3),
    },
    {
      id: 'urban-minimalism',
      tag: 'COLLECTION 02',
      title: 'Cairo Street Architecture',
      subtitle:
        'Structured silhouettes, bold lines, and premium Egyptian cotton tailoring for the modern nomad.',
      heroImage:
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop',
      colorTheme: 'bg-[#1E1E1E] text-[#FAF9F6]',
      accentColor: 'border-[#FAF9F6] text-[#FAF9F6] hover:bg-[#FAF9F6] hover:text-[#1E1E1E]',
      items: products.slice(3, 6),
    },
    {
      id: 'timeless-accents',
      tag: 'COLLECTION 03',
      title: 'Timeless Accents',
      subtitle:
        'Sleek premium detailing, handpicked local leather products, and heritage wrist accessories.',
      heroImage:
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop',
      colorTheme: 'bg-[#E5D5C5] text-[#2F251E]',
      accentColor: 'border-[#2F251E] text-[#2F251E] hover:bg-[#2F251E] hover:text-[#E5D5C5]',
      items: products.slice(6, 8),
    },
  ];

  return (
    <main className="min-h-screen bg-[#F4F2EE] font-sans pb-16">
      <Navbar />

      {/* Editorial Intro */}
      <section className="py-24 px-4 text-center max-w-3xl mx-auto">
        <span className="text-[10px] tracking-[0.25em] font-black uppercase text-slate-400 block mb-3">
          BRANDY EDITORIAL
        </span>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-6 uppercase">
          The Lookbook
        </h1>
        <div className="w-16 h-1 bg-slate-900 mx-auto mb-6"></div>
        <p className="text-slate-600 text-lg md:text-xl font-light leading-relaxed">
          A physical-meets-digital curated catalog showcasing high-fashion styling from Egypt’s
          premiere local independent designers. Explore seasonal lookbooks and shop individual items
          directly below.
        </p>
      </section>

      {/* Catalog Spreads */}
      <div className="container mx-auto px-4 max-w-6xl space-y-24">
        {spreads.map((spread, index) => {
          const isEven = index % 2 === 0;
          return (
            <section
              key={spread.id}
              className={`rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-3xl ${spread.colorTheme}`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
                {/* Image Panel (Left or Right based on layout) */}
                <div
                  className={`relative lg:col-span-6 h-[400px] lg:h-auto overflow-hidden group ${
                    isEven ? 'lg:order-first' : 'lg:order-last'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spread.heroImage}
                    alt={spread.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />

                  {/* Floating Catalog Stamp */}
                  <div className="absolute top-8 left-8 bg-black/85 text-white backdrop-blur-sm px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg">
                    {spread.tag}
                  </div>
                </div>

                {/* Content & Product Showcase Panel */}
                <div className="lg:col-span-6 p-8 md:p-14 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] tracking-[0.2em] font-black uppercase opacity-60 block mb-2">
                      {spread.tag}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
                      {spread.title}
                    </h2>
                    <p className="font-light text-base leading-relaxed opacity-80 mb-8 max-w-lg">
                      {spread.subtitle}
                    </p>

                    <div className="w-full h-px bg-current opacity-20 mb-8" />

                    {/* Shoppable Products in this Look */}
                    <h3 className="text-xs font-black tracking-widest uppercase mb-4 opacity-70">
                      Shop the Look:
                    </h3>

                    {spread.items.length === 0 ? (
                      <div className="py-6 text-sm italic opacity-50">
                        Check back soon to shop pieces from this look!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {spread.items.map(item => {
                          const itemImg =
                            item.images?.[0]?.url ||
                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30';
                          return (
                            <Link
                              key={item.id}
                              href={`/product/${item.id}`}
                              className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300"
                            >
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 border border-current/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={itemImg}
                                  alt={item.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block">
                                  {item.seller?.storeName || 'Local Brand'}
                                </span>
                                <h4 className="font-bold text-sm truncate group-hover/item:underline">
                                  {item.title}
                                </h4>
                                <span className="text-xs font-black">
                                  EGP {item.basePrice.toLocaleString()}
                                </span>
                              </div>
                              <span className="text-xs font-bold px-3 py-1 rounded-full border border-current/30 group-hover/item:border-current transition-colors">
                                View →
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-12 pt-6 border-t border-current/10">
                    <Link
                      href="/shop"
                      className={`inline-block px-6 py-3 border font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 ${spread.accentColor}`}
                    >
                      Explore Full Catalog
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Styled Magazine Callout */}
      <section className="container mx-auto px-4 max-w-6xl mt-24">
        <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="text-[10px] tracking-[0.25em] font-black uppercase text-amber-300 block mb-3">
              LATEST EDITION
            </span>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
              Brandy Print Catalog
            </h2>
            <p className="text-slate-300 font-light text-base leading-relaxed mb-8">
              Receive our seasonal high-fashion magazine directly to your doorstep. Features
              exclusive discounts, designer interviews, and full styled spreads. Free with any
              purchase over EGP 1,500.
            </p>
            <Link
              href="/shop"
              className="inline-block px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-lg"
            >
              Shop to Qualify
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
