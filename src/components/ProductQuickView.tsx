'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';
import ColorSwatch from './ColorSwatch';
import type { Product, ProductVariant } from '@/types';

interface ProductQuickViewProps {
  productId: string | null;
  onClose: () => void;
}

export default function ProductQuickView({ productId, onClose }: ProductQuickViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products?ids=${productId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.products?.[0]) {
            const p = data.products[0] as Product;
            setProduct(p);
            setSelectedVariant(p.variants?.[0] || null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProduct();
    return () => { cancelled = true; };
  }, [productId]);

  // Escape key to close
  useEffect(() => {
    if (!productId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [productId, onClose]);

  if (!productId) return null;

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    const image = product.images?.[0]?.url;
    addItem({
      id: selectedVariant.id,
      name: product.title,
      price: selectedVariant.price || product.basePrice,
      image: image || '',
      qty: quantity,
    });
    onClose();
  };

  // Extract unique colors from variants
  const colors = product?.variants
    ? Array.from(
        new Set(
          product.variants
            .map((v) => {
              try {
                return (JSON.parse(v.attributes || '{}') as { color?: string }).color;
              } catch {
                return null;
              }
            })
            .filter(Boolean) as string[]
        )
      )
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick view"
      onClick={onClose}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {loading ? (
          <div className="p-20 text-center text-gray-400">Loading product…</div>
        ) : !product ? (
          <div className="p-20 text-center text-gray-400">Product not found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image */}
            <div className="aspect-square bg-gray-50 relative">
              {product.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0].url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="md:hidden absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md"
              >
                <X size={18} />
              </button>
            </div>

            {/* Details */}
            <div className="p-8 relative">
              <button
                onClick={onClose}
                aria-label="Close"
                className="hidden md:flex absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 items-center justify-center"
              >
                <X size={18} />
              </button>

              <Link
                href={`/shop?q=${encodeURIComponent(product.seller?.storeName || '')}`}
                className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 hover:text-[#1e3b8a]"
              >
                {product.seller?.storeName}
              </Link>

              <h2 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                {product.title}
              </h2>

              <div className="text-2xl font-black text-[#1e3b8a] mb-4">
                {(selectedVariant?.price || product.basePrice).toLocaleString()} EGP
              </div>

              <p className="text-sm text-gray-600 mb-6 line-clamp-3">{product.description}</p>

              {/* Colors */}
              {colors.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-2">Color</div>
                  <ColorSwatch
                    colors={colors}
                    selected={
                      selectedVariant?.attributes
                        ? (JSON.parse(selectedVariant.attributes) as { color?: string }).color
                        : undefined
                    }
                    onSelect={(color) => {
                      const variant = product.variants?.find((v) => {
                        try {
                          const attrs = JSON.parse(v.attributes || '{}') as { color?: string };
                          return attrs.color === color;
                        } catch {
                          return false;
                        }
                      });
                      if (variant) setSelectedVariant(variant);
                    }}
                  />
                </div>
              )}

              {/* Qty */}
              <div className="mb-6">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Quantity</div>
                <div className="inline-flex items-center gap-2 border border-gray-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 text-gray-600 hover:bg-gray-50 rounded-l-xl"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 text-gray-600 hover:bg-gray-50 rounded-r-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || (selectedVariant.stockCount ?? 0) < 1}
                  className="flex-1 py-3 bg-[#1e3b8a] text-white rounded-xl font-bold hover:bg-[#152c6e] disabled:opacity-50"
                >
                  Add to Cart
                </button>
                <Link
                  href={`/product/${product.id}`}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 text-center"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
