'use client';

import { useWishlistStore } from '@/lib/wishlistStore';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from '@/types';

export type WishlistProduct = {
  id: string;
  title: string;
  basePrice: number;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  name?: string;
  price?: number;
  image?: string;
  img?: string;
};

export default function WishlistButton({
  product,
  className = '',
}: {
  product: WishlistProduct;
  className?: string;
}) {
  const { hasItem, toggleItem } = useWishlistStore();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isWished = hasItem(String(product.id));
  const productImage = product.image || product.images?.[0]?.url || product.img;

  return (
    <button
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (!session) {
          alert('Please sign in to add items to your wishlist.');
          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
        toggleItem(
          {
            id: String(product.id),
            name: product.name || product.title,
            price: product.price || product.basePrice,
            image: productImage,
          },
          session as Session | null
        );
      }}
      className={`z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow hover:bg-white transition-colors ${className}`}
      aria-label="Toggle wishlist"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isWished ? '#ef4444' : 'none'}
        stroke={isWished ? '#ef4444' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform active:scale-75 ${isWished ? 'text-red-500' : 'text-gray-600'}`}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
