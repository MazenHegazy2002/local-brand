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
  featuredProducts: (Product & { images: ProductImage[] })[];
  recentProducts: (Product & { images: ProductImage[] })[];
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
        <h2 className="ps-title">
          <span>{emoji}</span> {title}
        </h2>
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
  let homeData: HomePageData = { categories: [], featuredProducts: [], recentProducts: [] };
  let dict = en;

  try {
    const data = await getHomepageData();
    if (data) homeData = data as unknown as HomePageData;
    const d = await getDictionary();
    if (d) dict = d;
  } catch (e) {
    console.error('Critical SSR Error:', e);
  }

  const { featuredProducts, recentProducts } = homeData;

  // Use featured as Bestsellers, recent as New Arrivals, mix as Recommended
  const bestsellers = featuredProducts.length > 0 ? featuredProducts : recentProducts;
  const newArrivals = recentProducts.length > 0 ? recentProducts : featuredProducts;
  const recommended = [...recentProducts, ...featuredProducts].slice(0, 6);

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
          Join 100+ Egyptian local brands already growing their business. Zero upfront costs — just
          sign up and start selling.
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
