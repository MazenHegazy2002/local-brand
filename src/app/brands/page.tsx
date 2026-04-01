import Navbar from "@/components/Navbar";
import { MOCK_BRANDS } from "@/lib/data";
import Link from "next/link";

export default function BrandsPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      
      <div className="container py-12 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-20 fade-in">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-[hsl(var(--primary))] mb-6">Our <span className="text-[hsl(var(--accent))]">Creators</span></h1>
          <p className="text-xl text-gray-600">Meet the visionaries crafting the soul of the platform. We verify and support every artisan to ensure authentic quality.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_BRANDS.map((brand, idx) => (
            <Link key={brand.slug} href={`/brand/${brand.slug}`} className="block fade-in group" style={{ animationDelay: `${0.1 * idx}s` }}>
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 hover:border-[hsl(var(--accent))]/50 hover:shadow-md transition-all h-full flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full border-2 border-[hsl(var(--primary))]/10 mb-6 bg-gradient-to-br from-[hsl(var(--primary))]/5 to-transparent flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-serif font-bold text-[hsl(var(--primary))] opacity-80">{brand.name.substring(0, 1)}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{brand.name}</h3>
                <span className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--accent))]">Partner since {brand.joined}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
