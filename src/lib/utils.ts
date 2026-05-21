/**
 * XSS Sanitization utility using isomorphic-dompurify.
 * Used before inserting any user-generated rich text into DB (product descriptions, Q&A).
 * Works server-side (Node) via JSDOM, and client-side natively.
 */
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    // Drop all inline event handlers and unsafe protocols.
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'style',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  });
}

/**
 * Lightweight className helper used by some UI primitives.
 * Filters out falsy values and joins the rest with a space.
 */
export function cn(...inputs: Array<string | number | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}

// NOTE: previous versions of this file exported `mergeGuestCartToUser` and
// `processEscrowPayouts`. Both have been removed:
//
//   - `mergeGuestCartToUser` was never wired up; cart merge now happens via
//     the regular /api/cart POSTs after sign-in.
//   - `processEscrowPayouts` was a daily cron worker that incremented the
//     legacy `SellerProfile.balance` column. Earnings are now derived on the
//     fly by `computeSellerEarnings()` (src/lib/seller-earnings.ts), which
//     also enforces the 14-day escrow window. The /api/cron/payouts endpoint
//     has been simplified to a no-op for backwards-compat with the deployed
//     vercel.json schedule.
