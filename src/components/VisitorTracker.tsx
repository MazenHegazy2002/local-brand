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

    return () => {
      if (activeTimerRef.current) {
        clearInterval(activeTimerRef.current);
        activeTimerRef.current = null;
      }
    };
  }, [pathname, session]);

  return null;
}
