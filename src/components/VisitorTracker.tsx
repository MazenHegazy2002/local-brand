'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SessionUser } from '@/types';

// Custom lightweight Visitor Session Tracker
// Captures path, session token, load speeds, referrers, and durations.
export default function VisitorTracker() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const lastLogIdRef = useRef<string | null>(null);
  const activeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string>('');
  // Dedup guard — prevents React 18 Strict Mode double-fire from creating duplicate rows
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Generate a unique session token on browser load if not already present
    if (typeof window !== 'undefined') {
      let token = sessionStorage.getItem('brandy_visitor_session');
      if (!token) {
        token = `sess_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
        sessionStorage.setItem('brandy_visitor_session', token);
      }
      sessionTokenRef.current = token;
    }
  }, []);

  useEffect(() => {
    // Never track admin-os navigation — keeps analytics clean
    if (pathname.startsWith('/admin-os')) return;
    if (!sessionTokenRef.current) return;

    // Clear previous heartbeat timer
    if (activeTimerRef.current) {
      clearInterval(activeTimerRef.current);
      activeTimerRef.current = null;
    }

    // Capture speed performance safely
    let loadTimeMs: number | null = null;
    try {
      if (typeof window !== 'undefined' && window.performance) {
        // Modern PerformanceNavigationTiming
        const navigationTiming = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          loadTimeMs = Math.round(navigationTiming.duration);
        } else if (window.performance.timing) {
          // Fallback legacy Timing
          const timing = window.performance.timing;
          loadTimeMs = timing.loadEventEnd - timing.navigationStart;
          if (loadTimeMs <= 0) loadTimeMs = null;
        }
      }
    } catch {
      // swallow performance errors
    }

    const logEntry = async () => {
      // Strict Mode dedup: skip if we already fired for this session+path within 2 s
      const dedupeKey = `${sessionTokenRef.current}:${pathname}`;
      if (firedRef.current.has(dedupeKey)) return;
      firedRef.current.add(dedupeKey);
      setTimeout(() => firedRef.current.delete(dedupeKey), 2000);

      try {
        const userId = (session?.user as SessionUser | undefined)?.id || null;
        const res = await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionTokenRef.current,
            path: pathname,
            referrer: document.referrer || null,
            loadTimeMs,
            userId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            lastLogIdRef.current = data.id;

            // Heartbeat: update duration spent on this page every 10 seconds
            let secondsSpent = 0;
            activeTimerRef.current = setInterval(async () => {
              secondsSpent += 10;
              try {
                await fetch('/api/tracker', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: lastLogIdRef.current,
                    sessionToken: sessionTokenRef.current,
                    durationSec: secondsSpent,
                  }),
                  keepalive: true,
                });
              } catch {
                // ignore tracking heartbeat errors
              }
            }, 10000);
          }
        }
      } catch {
        // swallow tracking errors to guarantee no site disruption
      }
    };

    logEntry();

    // Auto-intercept key storefront actions (Add to Cart, Checkout, Purchase)
    const handleGlobalClick = (e: MouseEvent) => {
      if (!sessionTokenRef.current) return;
      const target = e.target as HTMLElement;
      const btn = target.closest('button') || target.closest('a');
      if (!btn) return;

      const text = (btn.textContent || '').toLowerCase().trim();
      const userId = (session?.user as SessionUser | undefined)?.id || null;

      if (
        text.includes('add to cart') ||
        text.includes('إضافة إلى السلة') ||
        text.includes('إضافة للسلة')
      ) {
        fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionTokenRef.current,
            path: pathname,
            eventType: 'ADD_TO_CART',
            eventDetails: 'Added product to cart',
            userId,
          }),
        }).catch(() => {});
      } else if (
        text.includes('checkout') ||
        text.includes('الدفع') ||
        text.includes('إتمام الشراء')
      ) {
        fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionTokenRef.current,
            path: pathname,
            eventType: 'CHECKOUT_STARTED',
            eventDetails: 'Proceeded to checkout',
            userId,
          }),
        }).catch(() => {});
      } else if (
        text.includes('place order') ||
        text.includes('تأكيد الطلب') ||
        text.includes('confirm order') ||
        text.includes('تأكيد طلبك')
      ) {
        fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionTokenRef.current,
            path: pathname,
            eventType: 'PURCHASE',
            eventDetails: 'Confirmed purchase order placement',
            userId,
          }),
        }).catch(() => {});
      }
    };

    window.addEventListener('click', handleGlobalClick);

    // Support standard dispatch event listener
    const handleCustomEvent = (ev: Event) => {
      const customEvent = ev as CustomEvent<{
        eventType: string;
        eventDetails?: string;
        path?: string;
      }>;
      if (!sessionTokenRef.current || !customEvent.detail) return;
      const userId = (session?.user as SessionUser | undefined)?.id || null;

      fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: sessionTokenRef.current,
          path: customEvent.detail.path || pathname,
          eventType: customEvent.detail.eventType,
          eventDetails: customEvent.detail.eventDetails || null,
          userId,
        }),
      }).catch(() => {});
    };

    window.addEventListener('brandy_track_event', handleCustomEvent);

    return () => {
      if (activeTimerRef.current) {
        clearInterval(activeTimerRef.current);
        activeTimerRef.current = null;
      }
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('brandy_track_event', handleCustomEvent);
    };
  }, [pathname, session]);

  return null;
}
