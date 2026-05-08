import Link from "next/link";
import Image from "next/image";
import WishlistButton, { WishlistProduct } from "./WishlistButton";
import { Badge, PriceDisplay } from "@/components/ui";
import type { Product, Tag } from "@/types";

type LegacyProduct = {
  id: number | string;
  name: string;
  image?: string;
  tags?: string[];
  brand?: string;
  brandSlug?: string;
  price?: number;
};

type ProductCardProduct = Omit<Partial<Product>, 'id' | 'category' | 'tags'> & LegacyProduct;

export default function ProductCard({ product, index }: { product: ProductCardProduct, index?: number }) {
  const displayId = String(product.id);
  const displayName = product.name || (product as Partial<Product>).title || "Product";
  const displayPrice = product.price ?? (product as Partial<Product>).basePrice ?? 0;
  const displayImage = product.image || (product as Partial<Product>).images?.[0]?.url;
  const productTags = product.tags || [];
  const productBrand = product.brand || ((product as Partial<Product>).seller as { storeName?: string } | undefined)?.storeName || "";
  const productBrandSlug = product.brandSlug || "";

  return (
    <div className="product-card group relative fade-in flex flex-col h-full" style={{ animationDelay: index ? `${0.1 * (index + 1)}s` : '0s' }}>
      <Link href={`/product/${displayId}`} className="block overflow-hidden relative aspect-[4/5] shrink-0">
        <Image 
          src={displayImage || "/placeholder.png"} 
          alt={displayName} 
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 z-20">
          <WishlistButton product={product as unknown as WishlistProduct} />
        </div>
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {productTags.slice(0, 2).map((tag: string | Tag) => {
            const tagName = typeof tag === 'string' ? tag : tag.name;
            return (
              <Badge key={tagName} size="sm" variant="default">
                {tagName}
              </Badge>
            );
          })}
        </div>
      </Link>
      <div className="p-6 flex flex-col flex-1 justify-between">
        <div>
          <Link href={`/brand/${productBrandSlug}`} className="text-[hsl(var(--accent))] text-xs font-bold uppercase tracking-wider mb-2 block hover:underline">
            {productBrand}
          </Link>
          <Link href={`/product/${displayId}`}>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 hover:text-[hsl(var(--accent))] transition-colors">
              {displayName}
            </h3>
          </Link>
        </div>
        <div className="mt-4">
          <PriceDisplay price={displayPrice} size="md" className="mb-4" />
          <button className="w-full bg-[hsl(var(--primary))] hover:opacity-90 text-white py-3 font-bold tracking-tight flex justify-between group/btn rounded-[var(--radius)] transition-all">
            <span>Add to Cart</span>
            <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">🛒</span>
          </button>
        </div>
      </div>
    </div>
  );
}