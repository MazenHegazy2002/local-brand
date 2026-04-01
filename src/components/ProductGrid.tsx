import Link from "next/link";
import ProductCard from "./ProductCard";
import { MOCK_PRODUCTS } from "@/lib/data";

export default function ProductGrid() {
  return (
    <section className="py-24 bg-[hsl(var(--background))]">
      <div className="container">
        <div className="flex items-end justify-between mb-16 px-4">
          <div className="max-w-xl">
            <span className="text-[hsl(var(--accent))] font-bold text-xs uppercase tracking-widest mb-4 inline-block">Curated Spotlight</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">Featured <span className="text-white/40">Creations</span></h2>
          </div>
          <Link href="/shop" className="text-white/60 hover:text-white transition-all pb-2 border-b border-white/20 hover:border-[hsl(var(--accent))] flex items-center gap-2 group">
            Browse All Brands
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {MOCK_PRODUCTS.slice(0, 3).map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
