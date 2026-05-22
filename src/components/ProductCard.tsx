'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WishlistButton, { WishlistProduct } from './WishlistButton';
import { Badge, PriceDisplay } from '@/components/ui';
import type { Product, Tag, ProductVariant, ProductImage } from '@/types';
import { useCartStore } from '@/lib/cartStore';
import { useLanguage } from '@/providers/LanguageContext';

// Comprehensive color map to convert variant color strings to hex/HSL color codes
const COLOR_MAP: Record<string, string> = {
  black: '#0f172a',
  white: '#f8fafc',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  pink: '#db2777',
  purple: '#9333ea',
  orange: '#ea580c',
  gray: '#64748b',
  grey: '#64748b',
  brown: '#78350f',
  beige: '#f5f5dc',
  navy: '#1e3a8a',
  maroon: '#7f1d1d',
  teal: '#0d9488',
  gold: '#d97706',
  silver: '#cbd5e1',
  lavender: '#e9d5ff',
  olive: '#808000',
  cream: '#fef3c7',
  charcoal: '#334155',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  khaki: '#f0e68c',
  cyan: '#0891b2',
  magenta: '#c026d3',
  turquoise: '#06b6d4',
  mustard: '#ca8a04',
  burgundy: '#881337',
  plum: '#4a0e4e',
  mint: '#6ee7b7',
  sky: '#38bdf8',
  peach: '#ffebd2',
  coral: '#f87171',
  bronze: '#cd7f32',
  copper: '#b87333',
  lilac: '#d8b4fe',
  apricot: '#ffb7c5',
  amber: '#f59e0b',
  emerald: '#10b981',
  sapphire: '#1d4ed8',
  rust: '#b45309',
  chocolate: '#4a3728',
  sand: '#f59e0b',
  camel: '#c2b280',
  tan: '#d2b48c',
  terracotta: '#c35237',
  denim: '#3b82f6',
  mauve: '#e0b0ff',
  sage: '#9caf88',
  taupe: '#483c32',
};

// Generates background color or split-color linear gradients for swatches
const getSwatchBackground = (colorName: string) => {
  const name = colorName.toLowerCase().trim();
  if (name.includes('/') || name.includes('-')) {
    const parts = name.split(/[\/-]/).map(p => p.trim());
    if (parts.length >= 2) {
      const color1 = COLOR_MAP[parts[0]] || parts[0];
      const color2 = COLOR_MAP[parts[1]] || parts[1];
      return `linear-gradient(135deg, ${color1} 50%, ${color2} 50%)`;
    }
  }
  return COLOR_MAP[name] || name;
};

type LegacyProduct = {
  id: number | string;
  name: string;
  image?: string;
  tags?: string[];
  brand?: string;
  brandSlug?: string;
  price?: number;
  variants?: ProductVariant[];
  images?: ProductImage[];
};

type ProductCardProduct = Omit<Partial<Product>, 'id' | 'category' | 'tags'> & LegacyProduct;

export default function ProductCard({
  product,
  index,
}: {
  product: ProductCardProduct;
  index?: number;
}) {
  const displayId = String(product.id);
  const displayName = product.name || (product as Partial<Product>).title || 'Product';
  const basePrice = product.price ?? (product as Partial<Product>).basePrice ?? 0;
  const displayImage = product.image || (product as Partial<Product>).images?.[0]?.url;
  const productTags = product.tags || [];
  const productBrand =
    product.brand ||
    ((product as Partial<Product>).seller as { storeName?: string } | undefined)?.storeName ||
    '';
  const productBrandSlug =
    product.brandSlug || productBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const isVerifiedLocal = (product as Partial<Product>).isVerifiedLocal ?? false;

  // ── Client Cart & Language Hooks ──
  const addItem = useCartStore(s => s.addItem);
  const { t } = useLanguage();

  const addToCartText = t ? t('AddToCart') || t('Add') || 'Add to Cart' : 'Add to Cart';
  const addedText = t ? t('AddedToCart') || t('Added') || 'Added ✓' : 'Added ✓';
  const egpText = t ? t('EGP') || 'EGP' : 'EGP';

  // ── Color Swatch & Variant Parsing ──
  const variants = (product.variants || []) as ProductVariant[];
  const colorMap = new Map<string, { variant: ProductVariant; colorName: string }>();

  variants.forEach(v => {
    try {
      const attrs = JSON.parse(v.attributes || '{}');
      const color = attrs.color || attrs.Color;
      if (color) {
        const colorName = String(color).trim();
        const key = colorName.toLowerCase();
        // Prefer in-stock variant if there are duplicates for the same color
        if (!colorMap.has(key) || (!colorMap.get(key)!.variant.stockCount && v.stockCount)) {
          colorMap.set(key, { variant: v, colorName });
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  });

  const uniqueColors = Array.from(colorMap.values());

  // ── Image Matching Logic ──
  const getMatchedImageUrl = (colorName: string) => {
    if (!colorName || !product.images) return null;
    const lowerColor = colorName.toLowerCase();

    // Find image that has the color name in its URL
    const matched = product.images.find(img => {
      const urlLower = img.url.toLowerCase();
      const regex = new RegExp(`\\b${lowerColor}\\b|[-_]${lowerColor}[-_.]`, 'i');
      return regex.test(urlLower) || urlLower.includes(lowerColor);
    });

    return matched?.url || null;
  };

  // ── Interactive Client State ──
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
  const [activePrice, setActivePrice] = useState<number>(basePrice);
  const [activeImage, setActiveImage] = useState<string | undefined>(displayImage);
  const [added, setAdded] = useState(false);

  // Initialize selected values based on parsed variants
  useEffect(() => {
    if (uniqueColors.length > 0) {
      const firstColor = uniqueColors[0];
      setSelectedColor(firstColor.colorName);
      setActiveVariant(firstColor.variant);
      setActivePrice(firstColor.variant.price || basePrice);

      const matchedImg = getMatchedImageUrl(firstColor.colorName);
      if (matchedImg) {
        setActiveImage(matchedImg);
      }
    }
  }, [product.variants, displayImage]);

  // Handle Add to Cart action
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: activeVariant?.id || displayId,
      name: displayName,
      price: activePrice,
      image: activeImage || displayImage || '/placeholder.png',
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className="product-card group relative fade-in flex flex-col h-full"
      style={{ animationDelay: index ? `${0.1 * (index + 1)}s` : '0s' }}
    >
      <Link
        href={`/product/${displayId}`}
        className="block overflow-hidden relative aspect-[4/5] shrink-0 bg-gray-50"
      >
        <Image
          src={activeImage || displayImage || '/placeholder.png'}
          alt={displayName}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-115"
          priority={index ? index < 4 : false}
        />
        {/* Wishlist Button Overlay */}
        <div className="absolute top-4 right-4 z-20">
          <WishlistButton product={product as unknown as WishlistProduct} />
        </div>
        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
          {isVerifiedLocal && (
            <span
              title="Verified Local Brand"
              className="inline-flex items-center gap-1 bg-[#1e3b8a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
            >
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Local
            </span>
          )}
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

      <div className="p-5 flex flex-col flex-1 justify-between bg-white dark:bg-[hsl(var(--card))]">
        <div>
          {/* Brand slug */}
          <Link
            href={`/brand/${productBrandSlug}`}
            className="text-[hsl(var(--accent))] text-xs font-bold uppercase tracking-wider mb-1.5 block hover:underline"
          >
            {productBrand}
          </Link>
          {/* Title */}
          <Link href={`/product/${displayId}`}>
            <h3 className="text-[15px] font-bold text-[hsl(var(--foreground))] line-clamp-2 mb-2 hover:text-[hsl(var(--accent))] transition-colors leading-tight">
              {displayName}
            </h3>
          </Link>

          {/* Color Swatches Grid */}
          {uniqueColors.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3.5 mt-1 items-center">
              {uniqueColors.map(({ variant, colorName }) => {
                const isSelected = selectedColor === colorName;
                const bgStyle = getSwatchBackground(colorName);
                const isWhite = colorName.toLowerCase() === 'white';

                return (
                  <button
                    key={variant.id}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(colorName);
                      setActiveVariant(variant);
                      setActivePrice(variant.price || basePrice);
                      const matchedImg = getMatchedImageUrl(colorName);
                      if (matchedImg) {
                        setActiveImage(matchedImg);
                      } else {
                        setActiveImage(displayImage);
                      }
                    }}
                    title={colorName}
                    className={`w-5.5 h-5.5 rounded-full transition-all duration-300 transform hover:scale-120 flex-shrink-0 relative ${
                      isWhite
                        ? 'border border-gray-300 dark:border-gray-600'
                        : 'border border-transparent'
                    }`}
                    style={{
                      backgroundColor:
                        bgStyle.startsWith('#') || bgStyle.startsWith('hsl') ? bgStyle : undefined,
                      background:
                        !bgStyle.startsWith('#') && !bgStyle.startsWith('hsl')
                          ? bgStyle
                          : undefined,
                      boxShadow: isSelected
                        ? `0 0 0 2px hsl(var(--card)), 0 0 0 4px hsl(var(--primary))`
                        : 'none',
                    }}
                    aria-label={`Select ${colorName} color`}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-2">
          {/* Dynamic Price Display */}
          <div className="mb-4">
            <PriceDisplay price={activePrice} size="md" />
          </div>

          {/* Add to Cart Premium Trigger */}
          <button
            onClick={handleAddToCart}
            disabled={added || (activeVariant ? activeVariant.stockCount === 0 : false)}
            className={`w-full text-white py-3 px-4 font-bold tracking-tight flex justify-between items-center group/btn rounded-[var(--radius)] transition-all ${
              added
                ? 'bg-green-600 hover:bg-green-600 shadow-lg shadow-green-600/20'
                : (activeVariant ? activeVariant.stockCount === 0 : false)
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-[hsl(var(--primary))] hover:opacity-90 active:scale-95 shadow-md shadow-[hsl(var(--primary))]/10'
            }`}
          >
            <span className="text-xs tracking-wide uppercase">
              {added
                ? addedText
                : (activeVariant ? activeVariant.stockCount === 0 : false)
                  ? 'Out of Stock'
                  : addToCartText}
            </span>
            <span className="text-sm opacity-80 group-hover/btn:translate-x-0.5 transition-transform">
              {added ? '✓' : '🛒'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
