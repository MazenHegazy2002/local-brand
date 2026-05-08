'use client';

import { useCompareStore } from '@/lib/compareStore';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';

export default function ComparePage() {
  const { items, removeItem, clearCompare } = useCompareStore();

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Compare Products</h1>
          {items.length > 0 && (
            <button 
              onClick={clearCompare}
              className="text-red-500 font-medium hover:text-red-600 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="text-6xl mb-4">⚖️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nothing to compare</h2>
            <p className="text-gray-500 mb-6">
              Add some products to the comparison list to see them side-by-side.
            </p>
            <Link href="/shop">
              <Button className="px-8 py-3">Return to Shop</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 text-left min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-6 font-bold text-gray-900 w-48 border-r border-b border-gray-100 bg-gray-50">
                    Features
                  </th>
                  {items.map((item) => (
                    <th key={item.id} className="p-6 font-bold text-gray-900 min-w-[250px] border-r border-b border-gray-100 relative group">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove from compare"
                      >
                        ✕
                      </button>
                      <div className="w-full aspect-square relative mb-4 rounded-xl overflow-hidden bg-gray-100">
                        {item.images?.[0] ? (
                          <Image src={item.images[0].url} alt={item.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                        )}
                      </div>
                      <Link href={`/product/${item.slug}`} className="text-lg hover:text-[#1e3b8a] transition-colors block mb-2">
                        {item.title}
                      </Link>
                      <div className="text-xl font-bold text-[#1e3b8a]">
                        {item.basePrice.toLocaleString()} EGP
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-6 font-semibold text-gray-700 border-r border-b border-gray-100 bg-gray-50">Brand</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-6 text-gray-600 border-r border-b border-gray-100">
                      {item.seller?.storeName || 'Local Brand'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-6 font-semibold text-gray-700 border-r border-b border-gray-100 bg-gray-50">Condition</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-6 text-gray-600 border-r border-b border-gray-100">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                        {item.condition || 'New'}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-6 font-semibold text-gray-700 border-r border-b border-gray-100 bg-gray-50">Availability</td>
                  {items.map((item) => {
                    const totalStock = item.variants?.reduce((sum, v) => sum + (v.stockCount || 0), 0) || 0;
                    return (
                      <td key={item.id} className="p-6 text-gray-600 border-r border-b border-gray-100">
                        {totalStock > 0 ? (
                          <span className="text-green-600 font-medium">In Stock ({totalStock})</span>
                        ) : (
                          <span className="text-red-500 font-medium">Out of Stock</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-6 font-semibold text-gray-700 border-r border-gray-100 bg-gray-50 rounded-bl-2xl">Action</td>
                  {items.map((item) => (
                    <td key={item.id} className="p-6 border-r border-gray-100">
                      <Link href={`/product/${item.slug}`}>
                        <Button className="w-full">View Details</Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}