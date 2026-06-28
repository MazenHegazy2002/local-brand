import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Link from 'next/link';
import { getHomepageData } from '@/app/actions/seller';
import { en } from '@/lib/i18n/dicts';
import { getDictionary } from '@/lib/i18n/server';
import ProductCard from '@/components/ProductCard';
import { Suspense } from 'react';
import { Product, ProductImage } from '@/types';
import PromoBanner from '@/components/PromoBanner';

interface HomePageData {
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  bestsellers: (Product & { images: ProductImage[] })[];
  newArrivals: (Product & { images: ProductImage[] })[];
  recommended: (Product & { images: ProductImage[] })[];
}

// ── Section ────────────────────────────────────────────────────────────────

function ProductSection({
  emoji,
  title,
  linkLabel,
  linkHref,
  products,
  dict,
}: {
  emoji: string;
  title: string;
  linkLabel: string;
  linkHref: string;
  products: (Product & { images: ProductImage[] })[];
  dict: typeof en;
}) {
  if (products.length === 0) return null;

  return (
    <section className="ps-section">
      <div className="ps-header">
        <div className="ps-title">
          {emoji && (
            <span className="text-xl shrink-0" aria-hidden="true">
              {emoji}
            </span>
          )}
          <h2
            style={{
              fontSize: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
              margin: 0,
              display: 'inline',
            }}
          >
            {title}
          </h2>
        </div>
        <Link href={linkHref} className="ps-link">
          {linkLabel} →
        </Link>
      </div>
      <div className="ps-grid">
        {products.slice(0, 6).map((p, idx) => (
          <ProductCard
            key={p.id}
            product={
              {
                ...p,
                name: p.title,
                image: p.images[0]?.url,
                brand: (p as any).seller?.storeName || dict.Brandy || 'Local Brand',
                brandSlug: (p as any).seller?.storeName
                  ? (p as any).seller.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  : '',
              } as any
            }
            index={idx}
          />
        ))}
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function Home() {
  let homeData: HomePageData = {
    categories: [],
    bestsellers: [],
    newArrivals: [],
    recommended: [],
  };
  let dict = en;

  try {
    const data = await getHomepageData();
    if (data) homeData = data as unknown as HomePageData;
    const d = await getDictionary();
    if (d) dict = d;
  } catch (e) {
    console.error('Critical SSR Error:', e);
  }

  const { bestsellers, newArrivals, recommended } = homeData;

  return (
    <main id="main-content" className="min-h-screen font-sans" style={{ background: '#f6f6f7' }}>
      <PromoBanner />
      <PromoBanner
        id="affiliate-program"
        message="💰 Earn up to 12% commission sharing your promo code — join our affiliate program!"
        ctaLabel="Apply now — it's free"
        ctaHref="/sell"
      />
      <Navbar />
      <Hero />

      {/* ── About Brandy & Value Proposition Section ── */}
      <section className="bg-white border-y border-gray-100 py-12 mb-8">
        <div className="home-shell">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#1e3b8a] mb-4">About Brandy</h2>
            <p className="text-slate-650 leading-relaxed text-sm md:text-base">
              Brandy is Egypt&apos;s premier dedicated marketplace empowering local, independent
              brands, artisans, and creators. We believe in the quality, craftsmanship, and
              potential of Egyptian products. By bridging the gap between local makers and conscious
              shoppers, we help grow local businesses while providing you with unique, premium
              fashion, home decor, electronics, and accessories. Experience local shopping redefined
              with verified brand authentication and complete escrow peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1e3b8a] flex items-center justify-center text-xl font-bold mx-auto mb-4">
                🇪🇬
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Supporting Local Talent</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Discover and directly support emerging Egyptian sellers, designers, and local
                artisans bringing you unique craftsmanship.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                🛡️
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Verified Quality Brands</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every brand is carefully vetted and verified by the Brandy team so you can shop
                premium quality with absolute confidence.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                🔒
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">14-Day Escrow Guarantee</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Shop secure. Your payment is held in escrow for 14 days post-delivery to guarantee
                product authenticity and stress-free returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section className="bg-slate-50 border-b border-gray-100 py-16">
        <div className="home-shell">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-[#1e3b8a] mb-3">How it Works</h2>
            <p className="text-slate-500 text-sm md:text-base">
              Connecting premium Egyptian makers directly with customers across the nation. Simple,
              safe, and transparent.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Shoppers */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-[#1e3b8a] mb-6 flex items-center gap-2">
                🛍️ For Shoppers
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-[#1e3b8a] flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      Discover Unique Local Brands
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Browse hundreds of hand-selected clothing, accessories, and home decor items
                      crafted by local artisans and Egyptian designers.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-[#1e3b8a] flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      100% Escrow Protection
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pay securely with Credit Cards, Meeza, or Fawry. Your funds are held safely in
                      escrow for 14 days post-delivery to guarantee quality.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-[#1e3b8a] flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Track & Trust</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Follow your shipping in real-time. If there is a dispute or sizing error,
                      return the item within 14 days for a complete refund.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Sellers */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-[#1e3b8a] mb-6 flex items-center gap-2">
                💼 For Sellers
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      Apply & Launch Storefront
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Submit your application and activate your store. Upload product photos,
                      pricing, and stock details in minutes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">
                      Built-in Delivery Integration
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      No courier contracts needed. Our system automatically books shipping labels
                      with our integrated domestic courier networks.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Earn Vetted Payouts</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      After the 14-day escrow window, your earnings are computed and automatically
                      transferred to your seller wallet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seller Spotlight Section ── */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="home-shell">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-[#1e3b8a] mb-3">
              Seller Spotlight
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Highlighting the incredible local brands that craft our marketplace catalogs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-shadow">
              <span className="inline-block bg-blue-50 text-[#1e3b8a] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-3">
                Cairo Loom
              </span>
              <h3 className="font-bold text-slate-900 text-base mb-2">Cairo Loom Garments</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Specializing in relaxed-fit linen shirts, dresses, and trousers crafted locally in
                Cairo. Supporting breathable, organic fabrics for Egypt's summer season.
              </p>
            </div>

            <div className="border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-shadow">
              <span className="inline-block bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-3">
                Alex Leather
              </span>
              <h3 className="font-bold text-slate-900 text-base mb-2">Alexandria Leatherworks</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Handcrafted genuine leather bags, belts, and accessories made by master craftsmen in
                Alexandria. Built for longevity, design elegance, and everyday durability.
              </p>
            </div>

            <div className="border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-shadow">
              <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-3">
                Fayoum Clay
              </span>
              <h3 className="font-bold text-slate-900 text-base mb-2">Oasis Terracotta Craft</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Handmade clay pots, tableware, and custom home accents sourced directly from
                artisans in Tunis Village, Fayoum. Blending tradition with modern kitchen utility.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="home-shell">
        <Suspense fallback={<div style={{ height: 400 }} />}>
          <ProductSection
            emoji="🔥"
            title="Bestsellers"
            linkLabel="All products"
            linkHref="/shop"
            products={bestsellers}
            dict={dict}
          />
          <ProductSection
            emoji="✨"
            title="New Arrivals"
            linkLabel="All new"
            linkHref="/shop?sort=newest"
            products={newArrivals}
            dict={dict}
          />
          <ProductSection
            emoji="💡"
            title="Recommended for You"
            linkLabel="All products"
            linkHref="/shop"
            products={recommended}
            dict={dict}
          />
        </Suspense>
      </div>

      {/* ── Customer Testimonials ── */}
      <section className="bg-slate-50 py-16 mt-8 border-y border-gray-100">
        <div className="home-shell">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-[#1e3b8a] mb-3">
              Verified Buyer Testimonials
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              See how our customers feel about supporting local makers with complete security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 italic leading-relaxed mb-6">
                "The linen blouse is gorgeous! It's so rare to find authentic Egyptian linen of this
                high quality at this price range. Courier delivery to Mansoura was prompt and
                verified."
              </p>
              <div>
                <div className="text-[#d97706] font-bold text-xs mb-1">★★★★★</div>
                <div className="font-bold text-slate-800 text-xs">Farida K.</div>
                <div className="text-[10px] text-slate-400">Verified Buyer, Mansoura</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 italic leading-relaxed mb-6">
                "Having the 14-day escrow protection gave me total confidence to buy online. The
                leather bag looks even better in person than the photos. Fits everything perfectly!"
              </p>
              <div>
                <div className="text-[#d97706] font-bold text-xs mb-1">★★★★★</div>
                <div className="font-bold text-slate-800 text-xs">Tarek M.</div>
                <div className="text-[10px] text-slate-400">Verified Buyer, Alexandria</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 italic leading-relaxed mb-6">
                "Brandy is exactly what the local industry needed. Vetted sellers, real reviews,
                Meeza/Fawry payment support, and great local style. Will definitely buy again."
              </p>
              <div>
                <div className="text-[#d97706] font-bold text-xs mb-1">★★★★★</div>
                <div className="font-bold text-slate-800 text-xs">Yasmine A.</div>
                <div className="text-[10px] text-slate-400">Verified Buyer, Cairo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Start Selling CTA ──────────────────────────────────────── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1e3b8a 0%, #16307a 100%)',
          color: '#fff',
          padding: '56px 20px',
          textAlign: 'center',
          marginTop: 32,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            opacity: 0.6,
            marginBottom: 12,
          }}
        >
          For Sellers
        </p>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, lineHeight: 1.2 }}>
          Sell your brand on Brandy
        </h2>
        <p
          style={{
            fontSize: 15,
            opacity: 0.75,
            maxWidth: 420,
            margin: '0 auto 28px',
            lineHeight: 1.6,
          }}
        >
          Join emerging Egyptian local brands already growing their business. Zero upfront costs —
          just sign up and start selling.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/seller/apply"
            style={{
              background: '#fff',
              color: '#1e3b8a',
              padding: '12px 28px',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Start Selling →
          </a>
          <a
            href="/legal/seller-terms"
            style={{
              border: '1.5px solid rgba(255,255,255,0.4)',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Learn more
          </a>
        </div>
      </section>

      {/* ── Scoped styles ─────────────────────────────────────────── */}
      <style>{`
        /* Page shell — clamp to ~1280px on big screens, snug on phones. */
        .home-shell {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
        }
        @media (max-width: 480px) { .home-shell { padding: 0 12px; } }
        /* Section */
        .ps-section { margin: 24px 0; }
        @media (min-width: 768px) { .ps-section { margin: 32px 0; } }
        .ps-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
        @media (min-width: 768px) { .ps-header { margin-bottom: 16px; } }
        .ps-title { font-size: 17px; font-weight: 800; color: #1e3b8a; display: flex; align-items: center; gap: 8px; }
        @media (min-width: 768px) { .ps-title { font-size: 20px; } }
        .ps-link { font-size: 12px; font-weight: 600; color: #1e3b8a; text-decoration: none; opacity: .75; white-space: nowrap; }
        @media (min-width: 768px) { .ps-link { font-size: 13px; } }
        .ps-link:hover { opacity: 1; text-decoration: underline; }
        .ps-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 640px) {
          .ps-grid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding: 4px 0 16px;
            margin: 0 -4px;
            gap: 12px;
          }
          .ps-grid::-webkit-scrollbar {
            display: none;
          }
          .ps-grid > * {
            flex: 0 0 72%;
            scroll-snap-align: start;
          }
        }
        @media (min-width: 640px)  { .ps-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; } }
        @media (min-width: 1024px) { .ps-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (min-width: 1280px) { .ps-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }

        /* Card */
        .pc-card {
          background: #fff;
          border-radius: 12px;
          padding: 12px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: box-shadow .2s, transform .2s;
          border: 1px solid #e8e3dc;
        }
        .pc-card:hover { box-shadow: 0 6px 24px rgba(30,59,138,.1); transform: translateY(-2px); }

        /* Badges */
        .pc-badges { display: flex; gap: 4px; position: absolute; top: 10px; left: 10px; z-index: 10; flex-wrap: wrap; }
        .pc-badge-disc {
          background: #d97706; color: #fff; font-size: 10px; font-weight: 800;
          padding: 2px 6px; border-radius: 4px; letter-spacing: .3px;
        }
        .pc-badge-new {
          background: #1e3b8a; color: #fff; font-size: 10px; font-weight: 800;
          padding: 2px 6px; border-radius: 4px; letter-spacing: .3px;
        }

        /* Wishlist */
        .pc-wish { position: absolute; top: 10px; right: 10px; z-index: 10; }

        /* Image */
        .pc-img-wrap {
          position: relative; width: 100%; padding-top: 100%;
          border-radius: 8px; overflow: hidden; background: #f2efe9;
          display: block; margin-top: 8px;
        }
        .pc-img { object-fit: cover; }

        /* Info */
        .pc-info { display: flex; flex-direction: column; gap: 4px; }
        .pc-brand { font-size: 10px; color: #9b9080; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin: 0; }
        .pc-title {
          font-size: 13px; font-weight: 700; color: #2d2824;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; margin: 0; line-height: 1.4;
        }
        .pc-title:hover { color: #1e3b8a; }
        .pc-prices { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
        .pc-price { font-size: 16px; font-weight: 800; color: #1e3b8a; }
        .pc-old { font-size: 11px; color: #b0a89e; text-decoration: line-through; }
        .pc-save { font-size: 11px; color: #d97706; font-weight: 600; margin: 0; }
        .pc-rating { display: flex; align-items: center; gap: 4px; font-size: 11px; }
        .pc-stars { color: #d97706; font-weight: 700; }
        .pc-reviews { color: #9b9080; }

        /* Button */
        .pc-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: #1e3b8a; color: #fff;
          border-radius: 8px; padding: 8px 0;
          font-size: 12px; font-weight: 700;
          text-decoration: none; margin-top: 4px;
          transition: background .15s;
        }
        .pc-btn:hover { background: #152c6e; }
      `}</style>
    </main>
  );
}
