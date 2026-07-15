'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const DISMISS_KEY = 'local-brand-promo-dismissed';

interface PromoBannerProps {
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
  id?: string; // unique id so multiple banners can be dismissed independently
}

export default function PromoBanner({
  message = 'Free shipping across Egypt on orders over 1000 EGP',
  ctaLabel = 'Shop now',
  ctaHref = '/shop',
  id = 'default',
}: PromoBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`${DISMISS_KEY}:${id}`);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [id]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(`${DISMISS_KEY}:${id}`, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-[#0F6E56] via-emerald-600 to-[#1e3b8a] text-white">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-center text-sm">
        <span className="font-bold">🎉 {message}</span>
        <Link href={ctaHref} className="underline font-bold hover:text-white/80">
          {ctaLabel}
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="ml-auto text-white/70 hover:text-white transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
