'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Reports Core Web Vitals to our custom endpoint. Mounted in the root layout.
 * Vercel Analytics also picks them up automatically via the <Analytics /> component.
 */
export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Best-effort fire-and-forget with sendBeacon fallback.
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      navigationType: metric.navigationType,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    const url = '/api/vitals';

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => { /* ignore */ });
      }
    } catch {
      // swallow — we never want analytics to break the app
    }
  });
  return null;
}
