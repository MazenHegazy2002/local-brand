'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollToTop ensures that page navigations in Next.js App Router always reset
 * the viewport scroll position to the top of the page (y = 0), preventing
 * pages (such as product details) from opening mid-scroll.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // If the URL contains an anchor hash (e.g. #reviews), preserve anchor jump
    if (typeof window === 'undefined' || window.location.hash || process.env.NODE_ENV === 'test')
      return;

    const resetScroll = () => {
      try {
        if (typeof window.scrollTo === 'function') {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      } catch {}
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    resetScroll();

    // Re-check on next animation frame and after a brief delay to ensure
    // asynchronous rendering / layout shifts do not retain previous scroll offsets.
    const rafId = requestAnimationFrame(resetScroll);
    const timerId = setTimeout(resetScroll, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [pathname]);

  return null;
}
