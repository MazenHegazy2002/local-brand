import Navbar from '@/components/Navbar';
import { ProductGridSkeleton } from '@/components/Skeleton';

export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="flex-1">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-3 items-center">
            <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </aside>

          <div className="flex-1">
            <ProductGridSkeleton count={12} />
          </div>
        </div>
      </div>
    </main>
  );
}
