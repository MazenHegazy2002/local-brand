'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 rounded-full bg-emerald-100 p-6 text-emerald-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        Something went wrong!
      </h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        We apologize for the inconvenience. An unexpected error occurred. 
        Our team has been notified and we're working to fix it.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="rounded-full bg-emerald-600 px-8 py-3 font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="rounded-full border-2 border-emerald-600 px-8 py-3 font-semibold text-emerald-600 transition-all hover:bg-emerald-50 hover:shadow-md focus:outline-none active:scale-95"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
