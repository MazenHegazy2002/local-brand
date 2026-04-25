import Link from "next/link";
import Image from "next/image";
import WishlistButton from "./WishlistButton";

export default function ProductCard({ product, index }: { product: any, index?: number }) {
  return (
    <div className="product-card group relative fade-in flex flex-col h-full" style={{ animationDelay: index ? `${0.1 * (index + 1)}s` : '0s' }}>
      <Link href={`/product/${product.id}`} className="block overflow-hidden relative aspect-[4/5] shrink-0">
        <Image 
          src={product.image} 
          alt={product.name} 
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 z-20">
          <WishlistButton product={product} />
        </div>
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {product.tags.map((tag: string) => (
            <span key={tag} className="bg-[hsl(var(--primary))]/80 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tighter">
              {tag}
            </span>
          ))}
        </div>
      </Link>
      <div className="p-6 flex flex-col flex-1 justify-between">
        <div>
          <Link href={`/brand/${product.brandSlug}`} className="text-[hsl(var(--accent))] text-xs font-bold uppercase tracking-wider mb-2 block hover:underline">
            {product.brand}
          </Link>
          <Link href={`/product/${product.id}`}>
            <h3 className="text-lg font-bold text-white line-clamp-2 mb-2 hover:text-[hsl(var(--accent))] transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>
        <div className="mt-4">
          <div className="text-xl font-serif font-bold text-white mb-4">
            {product.price}<span className="text-sm font-sans ml-1 text-white/50">EGP</span>
          </div>
          <button className="w-full btn bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 font-bold tracking-tight flex justify-between group/btn">
            <span>Add to Cart</span>
            <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">🛒</span>
          </button>
        </div>
      </div>
    </div>
  );
}
