import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Link from "next/link";
import Image from "next/image";
import { getHomepageData } from "@/app/actions/seller";
import { en } from "@/lib/i18n/dicts";
import { getDictionary } from "@/lib/i18n/server";
import WishlistButton from "@/components/WishlistButton";
import { Suspense } from "react";
import { Product, ProductImage } from "@/types";
import PromoBanner from "@/components/PromoBanner";

interface HomePageData {
  categories: never[];
  featuredProducts: (Product & { images: ProductImage[] })[];
  recentProducts: (Product & { images: ProductImage[] })[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fakeDiscount() {
  const pcts = [-96, -20, -38, -35, -17, -30, -28, -39, -21];
  return pcts[Math.floor(Math.random() * pcts.length)];
}

function fakeSave(base: number, pct: number) {
  return Math.round(base * Math.abs(pct) / 100);
}

function fakeRating() {
  return (4.4 + Math.random() * 0.5).toFixed(1);
}

function fakeReviews() {
  return Math.floor(500 + Math.random() * 5000).toLocaleString();
}

function fakeIsNew() {
  return Math.random() > 0.6;
}

function fakeOldPrice(base: number, pct: number) {
  return Math.round(base / (1 + pct / 100));
}

// ── Product Card ───────────────────────────────────────────────────────────

function ProductCard({
  id,
  title,
  brand,
  price,
  img,
  slug,
}: {
  id: string;
  title: string;
  brand: string;
  price: number;
  img: string;
  slug?: string;
}) {
  const pct = fakeDiscount();
  const oldPrice = fakeOldPrice(price, pct);
  const save = fakeSave(oldPrice, Math.abs(pct));
  const rating = fakeRating();
  const reviews = fakeReviews();
  const isNew = fakeIsNew();

  return (
    <div className="pc-card">
      {/* Badges */}
      <div className="pc-badges">
        <span className="pc-badge-disc">{pct}%</span>
        {isNew && <span className="pc-badge-new">NEW</span>}
      </div>

      {/* Wishlist */}
      <div className="pc-wish">
        <WishlistButton product={{ id, title, basePrice: price, images: [{ url: img }] } as any} />
      </div>

      {/* Image */}
      <Link href={`/product/${id}`} className="pc-img-wrap">
        <Image src={img} alt={title} fill sizes="200px" className="pc-img" />
      </Link>

      {/* Info */}
      <div className="pc-info">
        <p className="pc-brand">{brand}</p>
        <Link href={`/product/${id}`}>
          <h3 className="pc-title">{title}</h3>
        </Link>
        <div className="pc-prices">
          <span className="pc-price">{price.toLocaleString()} EGP</span>
          <span className="pc-old">{oldPrice.toLocaleString()} EGP</span>
        </div>
        <p className="pc-save">Save {save.toLocaleString()} EGP</p>
        <div className="pc-rating">
          <span className="pc-stars">★ {rating}</span>
          <span className="pc-reviews">· {reviews} reviews</span>
        </div>
        <Link href={`/product/${id}`} className="pc-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Tomorrow
        </Link>
      </div>
    </div>
  );
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
        <h2 className="ps-title"><span>{emoji}</span> {title}</h2>
        <Link href={linkHref} className="ps-link">{linkLabel} →</Link>
      </div>
      <div className="ps-grid">
        {products.slice(0, 6).map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            title={p.title}
            brand={dict.Brandy}
            price={p.basePrice}
            img={p.images[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop"}
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
    if (data) homeData = data as HomePageData;
    const d = await getDictionary();
    if (d) dict = d;
  } catch (e) {
    console.error("Critical SSR Error:", e);
  }

  const { featuredProducts, recentProducts } = homeData;

  // Use featured as Bestsellers, recent as New Arrivals, mix as Recommended
  const bestsellers = featuredProducts.length > 0 ? featuredProducts : recentProducts;
  const newArrivals = recentProducts.length > 0 ? recentProducts : featuredProducts;
  const recommended = [...recentProducts, ...featuredProducts].slice(0, 6);

  return (
    <main id="main-content" className="min-h-screen font-sans" style={{ background: "#f6f6f7" }}>
      <PromoBanner />
      <Navbar />
      <Hero />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
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

      {/* ── Scoped styles ─────────────────────────────────────────── */}
      <style>{`
        /* Section */
        .ps-section { margin: 32px 0; }
        .ps-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .ps-title { font-size: 20px; font-weight: 800; color: #1e3b8a; display: flex; align-items: center; gap: 8px; }
        .ps-link { font-size: 13px; font-weight: 600; color: #1e3b8a; text-decoration: none; opacity: .75; }
        .ps-link:hover { opacity: 1; text-decoration: underline; }
        .ps-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) { .ps-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 768px)  { .ps-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .ps-grid { grid-template-columns: repeat(2, 1fr); } }

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
