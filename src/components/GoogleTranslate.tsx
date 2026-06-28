'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    /** Call after dynamically loading new content to re-run the active translation. */
    retranslate?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
            layout?: number;
          },
          elementId: string
        ) => unknown;
      };
    };
  }
}

/**
 * Renders a hidden Google Translate widget. The toggle in `LanguageContext`
 * sets the `googtrans` cookie before reloading; on the next page load this
 * component initialises the widget which automatically translates the page
 * to whatever language the cookie specifies.
 *
 * The widget itself is hidden via CSS; we keep it mounted only so the
 * Google scripts have a target to attach to.
 *
 * IMPORTANT — Google Translate limitation with React:
 * Google Translate runs once on initial page HTML. Content loaded via
 * client-side data fetching (e.g. the /shop product grid) is injected into
 * the DOM AFTER Google Translate has already processed the page, so it
 * appears in English even when Arabic translation is active.
 *
 * SSR pages (homepage, product detail, category, brand page) work correctly
 * because product titles are present in the initial HTML.
 *
 * For client-side pages, call `window.retranslate()` after loading new
 * content to trigger a retranslation pass. This is exposed as a global so
 * any component can call it without a prop-drilling chain.
 */
export default function GoogleTranslate() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasTranslation =
      document.cookie.includes('googtrans') || window.localStorage.getItem('brandy-lang') === 'ar';
    if (!hasTranslation) return;

    const init = () => {
      if (!window.google?.translate) return;
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,ar',
            autoDisplay: false,
          },
          'google_translate_element'
        );
      } catch (err) {
        // Loaded twice — ignore.
        console.warn('[GoogleTranslate] init failed:', err);
      }
    };

    window.googleTranslateElementInit = init;

    // Expose a global helper for client-side components to retrigger translation
    // after dynamically loading content (product grids, search results, etc.).
    window.retranslate = () => {
      try {
        if (!document.cookie.includes('googtrans')) return;
        const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
        if (!select || !select.value || select.value === 'en') return;
        const tgt = select.value;
        // Briefly switch to English then back to the target language — this is
        // the documented way to force Google Translate to re-process the page.
        select.value = 'en';
        select.dispatchEvent(new Event('change'));
        setTimeout(() => {
          if (document.cookie.includes('googtrans')) {
            select.value = tgt;
            select.dispatchEvent(new Event('change'));
          }
        }, 120);
      } catch (err) {
        console.warn('[GoogleTranslate] retranslate failed:', err);
      }
    };

    if (!document.getElementById('gt-script')) {
      const script = document.createElement('script');
      script.id = 'gt-script';
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      // Script was loaded by a previous mount — initialise directly.
      init();
    }
  }, []);

  return <div id="google_translate_element" aria-hidden="true" style={{ display: 'none' }} />;
}
