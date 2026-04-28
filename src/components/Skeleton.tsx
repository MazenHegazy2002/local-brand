import React from 'react';

export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3">
        <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-[1.1/1] bg-gray-200 rounded-lg mb-4" />
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
  );
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-gray-200 pb-12">
      {Array.from({ length: count }).map((_, i) => (
        <CategorySkeleton key={i} />
      ))}
    </div>
  );
}
