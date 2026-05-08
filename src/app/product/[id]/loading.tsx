import Navbar from '@/components/Navbar';
import { Skeleton } from '@/components/ui';

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="w-48 h-4 rounded" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          
          <div className="w-full lg:w-[500px] shrink-0">
            <div className="sticky top-24">
              <Skeleton className="w-full aspect-[4/5] rounded-2xl mb-4" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="w-20 h-24 rounded-lg shrink-0" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-2xl">
            <Skeleton className="w-32 h-6 rounded mb-4" />
            <Skeleton className="w-full h-10 rounded mb-2" />
            <Skeleton className="w-3/4 h-10 rounded mb-6" />
            
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="w-40 h-8 rounded" />
              <Skeleton className="w-24 h-6 rounded" />
            </div>

            <div className="border-t border-b py-6 mb-8 space-y-4">
              <Skeleton className="w-16 h-4 rounded" />
              <Skeleton className="w-full h-24 rounded" />
            </div>

            <Skeleton className="w-32 h-6 rounded mb-4" />
            <div className="flex gap-3 mb-8">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-16 h-10 rounded" />
              ))}
            </div>

            <Skeleton className="w-full h-14 rounded-xl mb-4" />
            <Skeleton className="w-full h-14 rounded-xl" />
          </div>

        </div>
      </div>
    </div>
  );
}