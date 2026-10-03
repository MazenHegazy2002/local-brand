/**
 * Client-Side E-Commerce Event Tracker for Meta Pixel, TikTok Pixel & Google Analytics
 *
 * Safe execution: checks window objects before calling window.fbq, window.ttq, window.gtag
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    ttq?: {
      track: (eventName: string, properties?: any) => void;
      page: () => void;
    };
    gtag?: (...args: any[]) => void;
  }
}

export interface TrackProductItem {
  id: string;
  title: string;
  price: number;
  quantity?: number;
  category?: string;
}

export interface TrackOrderData {
  id: string;
  totalAmount: number;
  currency?: string;
  items?: TrackProductItem[];
}

/**
 * 1. Track PageView
 */
export function trackPageView(url?: string) {
  if (typeof window === 'undefined') return;

  try {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
    if (window.ttq) {
      window.ttq.page();
    }
    if (window.gtag) {
      window.gtag('event', 'page_view', { page_location: url || window.location.href });
    }
  } catch (err) {
    console.error('Client tracking error (PageView):', err);
  }
}

/**
 * 2. Track ViewContent (Product detail view)
 */
export function trackViewContent(product: TrackProductItem) {
  if (typeof window === 'undefined' || !product) return;

  const value = Number(product.price) || 0;
  const currency = 'EGP';

  try {
    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_ids: [product.id],
        content_name: product.title,
        content_type: 'product',
        value,
        currency,
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('ViewContent', {
        contents: [
          {
            content_id: product.id,
            content_name: product.title,
            price: value,
            quantity: 1,
          },
        ],
        value,
        currency,
      });
    }

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        currency,
        value,
        items: [
          {
            item_id: product.id,
            item_name: product.title,
            price: value,
            item_category: product.category || 'General',
          },
        ],
      });
    }
  } catch (err) {
    console.error('Client tracking error (ViewContent):', err);
  }
}

/**
 * 3. Track AddToCart
 */
export function trackAddToCart(item: TrackProductItem) {
  if (typeof window === 'undefined' || !item) return;

  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;
  const value = price * quantity;
  const currency = 'EGP';

  try {
    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [item.id],
        content_name: item.title,
        content_type: 'product',
        value,
        currency,
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('AddToCart', {
        contents: [
          {
            content_id: item.id,
            content_name: item.title,
            price,
            quantity,
          },
        ],
        value,
        currency,
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency,
        value,
        items: [
          {
            item_id: item.id,
            item_name: item.title,
            price,
            quantity,
          },
        ],
      });
    }
  } catch (err) {
    console.error('Client tracking error (AddToCart):', err);
  }
}

/**
 * 4. Track InitiateCheckout
 */
export function trackInitiateCheckout(items: TrackProductItem[], totalAmount: number) {
  if (typeof window === 'undefined') return;

  const value = Number(totalAmount) || 0;
  const currency = 'EGP';
  const contentIds = items.map(i => i.id);

  try {
    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: contentIds,
        num_items: items.length,
        value,
        currency,
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('InitiateCheckout', {
        contents: items.map(i => ({
          content_id: i.id,
          content_name: i.title,
          price: i.price,
          quantity: i.quantity || 1,
        })),
        value,
        currency,
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency,
        value,
        items: items.map(i => ({
          item_id: i.id,
          item_name: i.title,
          price: i.price,
          quantity: i.quantity || 1,
        })),
      });
    }
  } catch (err) {
    console.error('Client tracking error (InitiateCheckout):', err);
  }
}

/**
 * 5. Track Purchase (Client-Side with Event ID for Deduplication)
 */
export function trackPurchase(order: TrackOrderData, eventId?: string) {
  if (typeof window === 'undefined' || !order) return;

  const value = Number(order.totalAmount) || 0;
  const currency = order.currency || 'EGP';
  const items = order.items || [];
  const contentIds = items.map(i => i.id);
  const dedupId = eventId || order.id;

  try {
    // Meta Pixel (uses eventID parameter for deduplication with CAPI)
    if (window.fbq) {
      window.fbq(
        'track',
        'Purchase',
        {
          content_ids: contentIds,
          content_type: 'product',
          value,
          currency,
          num_items: items.length,
        },
        { eventID: dedupId }
      );
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('CompletePayment', {
        contents: items.map(i => ({
          content_id: i.id,
          content_name: i.title,
          price: i.price,
          quantity: i.quantity || 1,
        })),
        value,
        currency,
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: order.id,
        value,
        currency,
        items: items.map(i => ({
          item_id: i.id,
          item_name: i.title,
          price: i.price,
          quantity: i.quantity || 1,
        })),
      });
    }
  } catch (err) {
    console.error('Client tracking error (Purchase):', err);
  }
}
