import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const seller = await prisma.sellerProfile.findUnique({
    where: { storeName: slug }, // For now using slug as storeName identifier
    include: { products: { include: { images: true } } }
  });

  if (!seller) return notFound();

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      
      {/* Brand Hero Cover */}
      <div className="w-full h-80 bg-[hsl(var(--primary))] relative overflow-hidden flex items-center justify-center border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
        <div className="relative z-20 text-center container px-4">
           <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-lg uppercase tracking-tighter">{seller.storeName}</h1>
           <span className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))] text-xs uppercase font-bold tracking-widest px-4 py-1 rounded-full">Official Partner</span>
        </div>
      </div>

      <div className="container py-12 md:py-24">
        <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
           <h2 className="text-3xl font-serif font-bold text-white">Curated <span className="text-[hsl(var(--accent))]">Collection</span></h2>
           <span className="text-white/40 font-bold uppercase tracking-widest text-xs">{seller.products.length} Items</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 px-4">
          {seller.products.map((product: any, idx: number) => (
            <ProductCard key={product.id} product={{ ...product, image: product.images[0]?.url || '' }} index={idx} />
          ))}
        </div>
      </div>
    </main>
  );
}
