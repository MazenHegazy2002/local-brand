import React from 'react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-600"></div>
          <div className="absolute h-16 w-16 animate-ping rounded-full border-4 border-emerald-500/10"></div>
        </div>
        <p className="animate-pulse font-medium text-emerald-700">Loading Brandy...</p>
      </div>
    </div>
  );
}
