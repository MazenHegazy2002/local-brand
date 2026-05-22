import { Suspense } from 'react';
import VirtualTryOnContent from './VirtualTryOnContent';
import Navbar from '@/components/Navbar';

// Wrapping the client component that uses useSearchParams in <Suspense> is
// required by Next.js — otherwise the build fails with a path-undefined error.
export default function VirtualTryOnPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f9f8f6]">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1e3b8a] rounded-full animate-spin" />
          </div>
        </main>
      }
    >
      <VirtualTryOnContent />
    </Suspense>
  );
}
