'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
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
 */
export default function GoogleTranslate() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
