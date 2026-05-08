'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PaySkyLightboxConfig {
  MID: string;
  TID: string;
  AmountTrxn: string;
  MerchantReference: string;
  TrxDateTime: string;
  SecureHash: string;
  completeCallback?: (data: PaySkyCallback) => void;
  errorCallback?: (error: PaySkyError) => void;
  cancelCallback?: () => void;
}

interface PaySkyCallback {
  Amount: string;
  Currency: string;
  MerchantReference: string;
  NetworkReference?: string;
  PaidThrough: string;
  PayerAccount?: string;
  PayerName?: string;
  ProviderSchemeName?: string;
  SecureHash: string;
  SystemReference: string;
  TxnDate: string;
}

interface PaySkyError {
  error: string;
  DateTimeLocalTrxn: string;
  MerchantReferenece?: string;
  MerchantReference?: string;
  Amount?: string;
  SecureHash: string;
}

interface PaySkyLightboxAPI {
  Checkout: {
    configure: PaySkyLightboxConfig;
    showLightbox: () => void;
    closeLightbox: () => void;
  };
}

declare global {
  interface Window {
    Lightbox?: PaySkyLightboxAPI;
  }
}

interface PaySkyCheckoutProps {
  /** Server response from POST /api/payment/paysky */
  initData: {
    lightboxUrl: string;
    lightboxConfig: Omit<
      PaySkyLightboxConfig,
      'completeCallback' | 'errorCallback' | 'cancelCallback'
    >;
  };
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
  onCancel?: () => void;
}

let scriptPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.Lightbox?.Checkout) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load PaySky script')), {
        once: true,
      });
      return;
    }
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error('Failed to load PaySky LightBox.js'));
    document.head.appendChild(tag);
  });

  return scriptPromise;
}

export default function PaySkyCheckout({
  initData,
  onSuccess,
  onError,
  onCancel,
}: PaySkyCheckoutProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'verifying' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const triggeredRef = useRef(false);

  const handleComplete = useCallback(
    async (data: PaySkyCallback) => {
      setStatus('verifying');
      try {
        const res = await fetch('/api/payment/paysky/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) {
          setStatus('error');
          setErrorMsg(body.message || 'Payment verification failed.');
          onError(body.message || 'Payment verification failed.');
          return;
        }
        onSuccess(body.orderId);
      } catch (err: unknown) {
        const e = err as Error;
        setStatus('error');
        setErrorMsg(e.message);
        onError(e.message);
      }
    },
    [onSuccess, onError]
  );

  const handleError = useCallback(
    (error: PaySkyError) => {
      setStatus('error');
      const msg = error?.error || 'Payment was not completed.';
      setErrorMsg(msg);
      onError(msg);
    },
    [onError]
  );

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        await loadScript(initData.lightboxUrl);
        if (cancelled) return;
        if (!window.Lightbox?.Checkout) {
          throw new Error('PaySky Lightbox failed to initialize.');
        }
        window.Lightbox.Checkout.configure = {
          ...initData.lightboxConfig,
          completeCallback: handleComplete,
          errorCallback: handleError,
          cancelCallback: () => {
            setStatus('ready');
            onCancel?.();
          },
        };
        setStatus('ready');
        // Auto-open the Lightbox the first time we mount with valid config.
        if (!triggeredRef.current) {
          triggeredRef.current = true;
          window.Lightbox.Checkout.showLightbox();
        }
      } catch (err: unknown) {
        const e = err as Error;
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(e.message);
          onError(e.message);
        }
      }
    };
    start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData.lightboxUrl, initData.lightboxConfig.MerchantReference]);

  const reopen = () => {
    if (window.Lightbox?.Checkout) {
      setStatus('ready');
      setErrorMsg('');
      window.Lightbox.Checkout.showLightbox();
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Verifying your payment with PaySky…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-bold text-red-800">{errorMsg || 'Payment failed.'}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reopen}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-8 h-8 border-4 border-[#1e3b8a] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-slate-500">
        {status === 'loading'
          ? 'Loading secure PaySky checkout…'
          : 'PaySky checkout is open.'}
      </p>
      <button
        type="button"
        onClick={reopen}
        className="text-xs text-[#1e3b8a] underline hover:no-underline"
      >
        Reopen checkout window
      </button>
    </div>
  );
}
