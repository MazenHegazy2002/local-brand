'use client';

import { useState } from 'react';

export function ShareButton({
  productId,
  productName,
  productSlug,
}: {
  productId: string;
  productName: string;
  productSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const displayId = productSlug || productId;
    const url = `${window.location.origin}/product/${displayId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 rounded-xl px-3 py-2 bg-white"
        aria-label="Share product"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out ${productName} on Brandy! ${typeof window !== 'undefined' ? window.location.origin : ''}/product/${productSlug || productId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-sm text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-green-500 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436 0 9.86-4.418 9.863-9.85.001-2.63-1.018-5.101-2.868-6.957C16.42 1.988 13.943 1.93 12.01 1.93c-5.438 0-9.863 4.417-9.867 9.851 0 1.547.41 3.053 1.186 4.398l-.994 3.63 3.722-.975zm11.367-7.051c-.266-.134-1.577-.777-1.822-.866-.245-.09-.424-.134-.602.134-.178.268-.69 1.16-.846 1.34-.156.18-.312.2-.578.066-1.286-.642-2.226-1.121-3.136-2.682-.24-.412.24-.382.687-1.272.074-.15.037-.28-.018-.413-.056-.133-.502-1.206-.688-1.65-.18-.435-.363-.376-.502-.376-.13 0-.279-.011-.428-.011-.15 0-.393.056-.599.28-.206.223-.787.77-.787 1.879 0 1.11.805 2.18 1.17 2.682.07.09 1.585 2.427 3.84 3.402.537.233.956.37 1.282.474.54.172 1.03.148 1.417.09.432-.064 1.577-.644 1.8-.1.228-.222.424-.544.424-.866 0-.08-.008-.15-.018-.214-.056-.066-.222-.2-.488-.334z" />
            </svg>
            Share on WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/product/${productSlug || productId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-600 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Share on Facebook
          </a>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
          >
            <span className="text-gray-500 text-lg">{copied ? '✅' : '🔗'}</span>
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
