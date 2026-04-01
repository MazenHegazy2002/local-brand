import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { MOCK_PRODUCTS } from "@/lib/data";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = await params;
  const categoryName = unwrappedParams.slug.replace('-', ' ');
  
  const products = MOCK_PRODUCTS.filter(p => p.categorySlug === unwrappedParams.slug);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <div className="container py-12 md:py-24">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-2 capitalize">
          {categoryName} <span className="text-[hsl(var(--accent))]">Collection</span>
        </h1>
        <p className="text-white/50 text-lg mb-12 max-w-2xl">
          Discover the finest local creations in the {categoryName} category. Curated for unmatched quality and authentic heritage.
        </p>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </div>
        ) : (
           <div className="py-24 text-center glass rounded-3xl border border-white/5">
              <h2 className="text-2xl font-serif text-white/50">No products found for this category.</h2>
           </div>
        )}
      </div>
    </main>
  );
}
