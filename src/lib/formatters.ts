/**
 * Locale-aware formatters for prices, dates, and numbers.
 * Usable on both server and client since they only use standard Intl APIs.
 */

export type AppLocale = 'en-EG' | 'ar-EG';

export function formatEGP(amount: number, locale: AppLocale = 'en-EG'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, locale: AppLocale = 'en-EG'): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatDateLong(date: Date | string, locale: AppLocale = 'en-EG'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date | string, locale: AppLocale = 'en-EG'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(date: Date | string, locale: AppLocale = 'en-EG'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const absSeconds = Math.abs(diff) / 1000;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) return rtf.format(Math.round(diff / 1000), 'second');
  if (absSeconds < 3600) return rtf.format(Math.round(diff / 60000), 'minute');
  if (absSeconds < 86400) return rtf.format(Math.round(diff / 3600000), 'hour');
  if (absSeconds < 604800) return rtf.format(Math.round(diff / 86400000), 'day');
  if (absSeconds < 2592000) return rtf.format(Math.round(diff / 604800000), 'week');
  if (absSeconds < 31536000) return rtf.format(Math.round(diff / 2592000000), 'month');
  return rtf.format(Math.round(diff / 31536000000), 'year');
}

/**
 * Arabic pluralization helper. Arabic has 6 plural categories: zero, one, two, few, many, other.
 * Using Intl.PluralRules to correctly select the form.
 */
export function pluralize(
  count: number,
  forms: { zero?: string; one: string; two?: string; few?: string; many?: string; other: string },
  locale: AppLocale = 'en-EG'
): string {
  const rules = new Intl.PluralRules(locale);
  const rule = rules.select(count);
  return (forms as Record<string, string>)[rule] || forms.other;
}

/**
 * Format a price range, useful for variant product cards.
 */
export function formatPriceRange(min: number, max: number, locale: AppLocale = 'en-EG'): string {
  if (min === max) return formatEGP(min, locale);
  return `${formatEGP(min, locale)} – ${formatEGP(max, locale)}`;
}

/**
 * Format raw order status into human-readable label with Cash on Delivery support.
 */
export function formatOrderStatus(status: string, paymentMethod?: string): string {
  if (status === 'PENDING_PAYMENT') {
    if (paymentMethod === 'CASH_ON_DELIVERY') {
      return 'Confirmed (Pay on Delivery)';
    }
    return 'Awaiting Payment';
  }
  return status.replace(/_/g, ' ');
}
