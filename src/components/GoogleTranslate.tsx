'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    retranslate?: () => void;
  }
}

export default function GoogleTranslate() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.retranslate = () => {};
    }
  }, []);

  return null;
}
