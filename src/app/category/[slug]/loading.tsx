import Navbar from '@/components/Navbar';
import { ProductGridSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded mb-4" />
        <div className="h-4 w-96 bg-slate-100 animate-pulse rounded mb-8" />
        <ProductGridSkeleton count={12} />
      </div>
    </main>
  );
}
