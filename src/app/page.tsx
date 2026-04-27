import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Link from "next/link";
import Image from "next/image";
import { getHomepageData } from "./actions";
import { DictKey } from "@/lib/i18n/dicts";
import { getDictionary } from "@/lib/i18n/server";
import WishlistButton from "@/components/WishlistButton";

export default async function Home() {
  const { categories: dbCategories, featuredProducts, recentProducts } = await getHomepageData();
  const dict = await getDictionary();

  const categories = dbCategories.length > 0 ? dbCategories.map((c: any) => ({
    name: c.name,
    icon: <ElectronicsIcon /> // Fallback icon
  })) : [
    { name: dict.Electronics, icon: <ElectronicsIcon /> },
    { name: dict.Fashion, icon: <FashionIcon /> },
    { name: dict.HomeDecor, icon: <HomeIcon /> },
    { name: dict.HealthBeauty, icon: <HealthIcon /> },
    { name: dict.Sports, icon: <SportsIcon /> },
  ];

  const hotDeals: any[] = featuredProducts.map((p: any) => ({
    id: p.id,
    brand: dict.LocalBrand,
    title: p.title,
    price: `${p.basePrice} ${dict.EGP}`,
    badge: dict.Sale,
    badgeColor: "bg-[#d97706]",
    img: p.images[0]?.url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop"
  }));
  
  // Default deals if none featured
  if (hotDeals.length === 0) {
    hotDeals.push({ id: "1", brand: "NIKE SPORT", title: "Air Max Velocity Red", price: "$129.00", oldPrice: "$165.00", badge: "-30%", badgeColor: "bg-[#d97706]", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop" });
  }

  const pickedForYou = recentProducts.map((p: any) => ({
    id: p.id,
    title: p.title,
    price: `${p.basePrice} ${dict.EGP}`,
    img: p.images[0]?.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop"
  }));

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] font-sans pb-10">
      <Navbar />
      <Hero />
      
      {/* 1. Browse Categories Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6 px-1">
          <h2 className="text-[22px] md:text-2xl font-bold text-gray-900 tracking-tight">{dict.BrowseCategories}</h2>
          <Link href="/shop" className="text-[#1e3b8a] font-bold text-[13px] hover:underline mb-1">
            {dict.ViewAllDepartments}
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-gray-200 pb-12">
          {categories.map((cat: any, i: number) => (
            <Link href="/shop" key={i} className="flex flex-col items-center group cursor-pointer">
              {/* Boxy White Background Card with Blue Icon */}
              <div className="w-full aspect-[1.1/1] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 group-hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-all rounded-lg flex items-center justify-center mb-4">
                <div className="text-[#1e3b8a] scale-[1.35] group-hover:scale-[1.45] transition-transform">
                  {cat.icon}
                </div>
              </div>
              <span className="font-bold text-gray-800 text-[13px] tracking-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>
      
      {/* 2. Hot Deals Now */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6 px-1">
          <h2 className="text-[22px] md:text-2xl font-bold text-gray-900 tracking-tight">{dict.HotDealsNow}</h2>
          <span className="bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-100 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
            {dict.EndsIn} 04:23:18
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotDeals.map((item: any, i: number) => (
            <Link href={`/product/${item.id}`} key={i} className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer block group">
              <div className="relative aspect-square bg-gray-50 flex items-center justify-center">
                {item.badge && (
                  <div className={`absolute top-4 left-4 z-10 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm ${item.badgeColor}`}>
                    {item.badge}
                  </div>
                )}
                <div className="absolute top-4 right-4 z-20">
                  <WishlistButton product={item} />
                </div>
                <Image src={item.img} alt={item.title} layout="fill" objectFit="cover" className="group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">{item.brand}</span>
                <h3 className="font-bold text-gray-900 text-[13px] mb-2 leading-tight truncate">{item.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{item.price}</span>
                  {item.oldPrice && <span className="text-xs text-gray-400 font-medium line-through">{item.oldPrice}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Empowering Local Brands (Mid-page Banner) */}
      <section className="container mx-auto px-4 py-12">
        <div className="bg-[#eef3f7] rounded-xl p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="lg:w-1/2 max-w-md">
            <h2 className="text-2xl md:text-[28px] font-bold text-[#1e3b8a] mb-4 tracking-tight leading-tight">{dict.EmpoweringLocalBrands}</h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {dict.PlatformFeaturesDesc}
            </p>
            <Link href="/shop?local=true" className="inline-block bg-[#1e3b8a] hover:bg-[#152c6e] text-white font-bold text-sm py-2.5 px-6 rounded-md transition-colors shadow-sm">
              {dict.ShopLocal}
            </Link>
          </div>
          
          <div className="lg:w-1/2 flex flex-col sm:flex-row justify-end gap-6 w-full">
            {/* Brand Store Card 1 */}
            <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center flex-1 shadow-sm border border-white/50">
              <div className="w-14 h-14 bg-[#e8f3ee] text-[#4d866a] rounded-lg mb-4 flex items-center justify-center">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">EcoHome Co.</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Sustainable Living</p>
            </div>
            {/* Brand Store Card 2 */}
            <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center flex-1 shadow-sm border border-white/50">
              <div className="w-14 h-14 bg-gray-900 text-white rounded-lg mb-4 flex items-center justify-center font-black italic tracking-tighter">
                US
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Urban Stitch</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Contemporary Apparel</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Picked For You */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6 px-1 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-[22px] md:text-2xl font-bold text-gray-900 tracking-tight mb-1">Picked For You</h2>
            <p className="text-xs text-gray-500">Based on your recent browsing</p>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronLeft /></button>
            <button className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronRight /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {pickedForYou.map((item: any, i: number) => (
            <Link href={`/product/${item.id}`} key={i} className="group cursor-pointer">
              <div className="w-full aspect-[4/5] bg-white rounded-lg overflow-hidden border border-gray-100 mb-3 relative">
                <div className="absolute top-2 right-2 z-20">
                  <WishlistButton product={item} />
                </div>
                <Image src={item.img} alt={item.title} layout="fill" objectFit="cover" className="group-hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-xs mb-1 truncate">{item.title}</h3>
              <p className="font-bold text-[#1e3b8a] text-xs">{item.price}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer styled exactly as the image */}
      <footer className="mt-16 container mx-auto px-4 py-12 border-t border-gray-200 pt-16">
        <div className="flex flex-col lg:flex-row justify-between gap-12">
          
          <div className="lg:w-1/3">
            <h2 className="text-xl font-bold text-[#1e3b8a] tracking-tight mb-4 uppercase">Marketplace</h2>
            <p className="text-[11px] leading-relaxed text-gray-500 max-w-xs mb-6">
              The world's most trusted curated marketplace for high-end electronics, fashion, and home essentials. Since 2024.
            </p>
            <div className="flex gap-3 text-[#1e3b8a]">
              {/* Fake social blocks */}
              <div className="w-6 h-6 rounded-full border border-gray-200" />
              <div className="w-6 h-6 rounded-full border border-gray-200" />
              <div className="w-6 h-6 rounded-full border border-gray-200" />
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-12 lg:gap-24 w-full justify-between lg:justify-end">
            <div>
              <h4 className="font-bold text-gray-900 text-[10px] uppercase tracking-wider mb-5">Shop & Discover</h4>
              <ul className="space-y-4 text-[11px] text-gray-500">
                <li><Link href="/" className="hover:text-gray-900">Flash Sales</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Popular Brands</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Gift Cards</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Sell on Marketplace</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-[10px] uppercase tracking-wider mb-5">Customer Care</h4>
              <ul className="space-y-4 text-[11px] text-gray-500">
                <li><Link href="/" className="hover:text-gray-900">Help Center</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Track My Order</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Shipping Info</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Returns & Refunds</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-[10px] uppercase tracking-wider mb-5">Legal & Policy</h4>
              <ul className="space-y-4 text-[11px] text-gray-500">
                <li><Link href="/" className="hover:text-gray-900">Terms of Service</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Privacy Policy</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Cookie Settings</Link></li>
                <li><Link href="/" className="hover:text-gray-900">Accessibility</Link></li>
              </ul>
            </div>
          </div>

        </div>
      </footer>
    </main>
  );
}

// Minimal Icons used exactly as rendered in Stitch for categories
function ElectronicsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="16" height="12" rx="1" ry="1"/><path d="M6 16v4h8v-4"/><rect x="18" y="10" width="4" height="8" rx="1"/></svg>; }
function FashionIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 0-2 2 c0 1 1 2 2 2 c1 0 2-1 2-2 a2 2 0 0 0-2-2z"/><path d="M12 6l-6 10h12z"/><path d="M12 6v-4"/></svg>; }
function HomeIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function GroceryIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function HealthIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function SportsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 14.4V9.6"/><path d="M14 16.8V7.2"/><path d="M10 16.8V7.2"/><path d="M6 14.4V9.6"/><path d="M22 12H2"/><path d="M18 12h-4"/><path d="M10 12H6"/></svg>; }
function ChevronLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>; }
function ChevronRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>; }
