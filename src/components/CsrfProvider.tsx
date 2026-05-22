'use client';

/**
 * CsrfProvider — patches window.fetch once on mount so every
 * state-mutating request (POST / PUT / PATCH / DELETE) automatically
 * carries the `x-csrf-token` header read from the csrf-token cookie.
 *
 * Mount this once in the root layout. It renders nothing visible.
 *
 * Why patch fetch instead of a custom hook?
 *   The admin-os page, seller-hub, and many components make raw fetch()
 *   calls. Wrapping them individually would require touching 100+ call
 *   sites. Patching globalThis.fetch once is safer and requires zero
 *   changes to existing code.
 */

import { useEffect } from 'react';
import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/csrf';

function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export default function CsrfProvider() {
  useEffect(() => {
    const original = globalThis.fetch.bind(globalThis);

    globalThis.fetch = async function csrfPatchedFetch(
      input: RequestInfo | URL,
      init: RequestInit = {}
    ): Promise<Response> {
      const method = (init.method ?? 'GET').toUpperCase();

      if (MUTATING_METHODS.has(method)) {
        // Only inject for same-origin requests — don't leak our token to CDNs.
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);

        if (isSameOrigin) {
          const token = readCsrfCookie();
          if (token) {
            init = {
              ...init,
              headers: {
                [CSRF_HEADER]: token,
                ...init.headers, // caller headers override (so manual override is possible)
              },
            };
          }
        }
      }

      return original(input, init);
    };

    // Expose the cookie name for debugging / manual override
    (globalThis as Record<string, unknown>).__csrfCookieName = CSRF_COOKIE;

    return () => {
      // Restore on unmount (mostly for test cleanup)
      globalThis.fetch = original;
    };
  }, []);

  return null;
}
