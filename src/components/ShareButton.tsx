'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useCartStore } from '@/lib/cartStore';
import { MOCK_PRODUCTS } from '@/lib/data';

// Share utility
function getShareLinks(productId: string, productName: string) {
  const url = `${window.location.origin}/product/${productId}`;
  const text = `Check out ${productName} on LocalBrand Egypt! 🛍️`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    copyUrl: url,
  };
}

export function ShareButton({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/product/${productId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 rounded-xl px-3 py-2 bg-white"
        aria-label="Share product"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out ${productName} on LocalBrand! ${window.location.origin}/product/${productId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-sm text-gray-700 transition-colors"
          >
            <span className="text-green-500 text-lg">💬</span> Share on WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/product/${productId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
          >
            <span className="text-blue-600 text-lg">👤</span> Share on Facebook
          </a>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
          >
            <span className="text-gray-500 text-lg">{copied ? '✅' : '🔗'}</span>
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
