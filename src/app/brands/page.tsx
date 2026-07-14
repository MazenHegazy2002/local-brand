import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/lib/i18n/server';
import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Local Brands — Egyptian Sellers',
  description:
    'Discover verified Egyptian local brands on Brandy. Shop authentic products direct from local sellers across fashion, electronics, home goods, and more.',
  openGraph: {
    title: 'Local Brands — Egyptian Sellers',
    description: 'Shop authentic products from verified Egyptian local sellers.',
    url: `${PLATFORM_URL}/brands`,
    type: 'website',
  },
};

export default async function BrandsPage() {
  const t = await getDictionary();

  let brands: Array<{
    id: string;
    storeName: string;
    logoUrl: string | null;
    createdAt: Date;
  }> = [];
  try {
    brands = await prisma.sellerProfile.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true, storeName: true, logoUrl: true, createdAt: true },
      orderBy: { storeName: 'asc' },
      take: 60,
    });
  } catch (err) {
    // DB unavailable during build / dev — render the page empty rather than 500.
    console.error('[brands] failed to load sellers:', err);
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />

      <div className="container py-12 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-20 fade-in">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-[hsl(var(--primary))] mb-6">
            {t.OurCreators}
          </h1>
          <p className="text-xl text-gray-600">{t.OurCreatorsDesc}</p>
        </div>

        {brands.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🛍️</div>
            <p>No active brands yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {brands.map((brand, idx) => {
              const slug = brand.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const initial = brand.storeName.slice(0, 1).toUpperCase();
              const joinedYear = new Date(brand.createdAt).getFullYear();
              return (
                <Link
                  key={brand.id}
                  href={`/brand/${slug}`}
                  className="block fade-in group"
                  style={{ animationDelay: `${0.1 * idx}s` }}
                >
                  <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 hover:border-[hsl(var(--accent))]/50 hover:shadow-md transition-all h-full flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full border-2 border-[hsl(var(--primary))]/10 mb-6 bg-gradient-to-br from-[hsl(var(--primary))]/5 to-transparent flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={brand.logoUrl}
                          alt={brand.storeName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/placeholder.png"
                          alt={brand.storeName}
                          className="w-full h-full object-cover opacity-50"
                        />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{brand.storeName}</h3>
                    <span className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
                      {t.PartnerSince} {joinedYear}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
