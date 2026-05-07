'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useState } from 'react';

const popularCategories = [
  { name: 'Electronics', slug: 'electronics', color: 'bg-blue-50 text-blue-600' },
  { name: 'Fashion', slug: 'fashion', color: 'bg-pink-50 text-pink-600' },
  { name: 'Home & Decor', slug: 'home-decor', color: 'bg-amber-50 text-amber-600' },
  { name: 'Health & Beauty', slug: 'health-beauty', color: 'bg-purple-50 text-purple-600' },
];

export default function NotFoundPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* 404 Large Heading */}
          <div className="mb-8">
            <h1 className="text-[150px] md:text-[180px] font-black text-gray-200 leading-none select-none">
              404
            </h1>
            <div className="-mt-16 md:-mt-20">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Page Not Found
              </h2>
              <p className="text-gray-500 text-lg max-w-md mx-auto">
                Sorry, we couldn&apos;t find the page you&apos;re looking for. Let&apos;s help you find what you need.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-12">
            <div className="flex gap-3 max-w-lg mx-auto">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full px-5 py-4 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] focus:border-transparent"
                />
                <svg 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <button 
                type="submit"
                className="px-6 py-4 bg-[#1e3b8a] hover:bg-[#152c6e] text-white font-bold rounded-xl transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Link 
              href="/"
              className="px-6 py-3 bg-white border border-gray-200 hover:border-[#1e3b8a] text-gray-700 hover:text-[#1e3b8a] font-semibold rounded-xl transition-colors"
            >
              Go to Homepage
            </Link>
            <Link 
              href="/shop"
              className="px-6 py-3 bg-[#1e3b8a] hover:bg-[#152c6e] text-white font-bold rounded-xl transition-colors"
            >
              Browse Shop
            </Link>
          </div>

          {/* Popular Categories Grid */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Popular Categories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularCategories.map((cat) => (
                <Link 
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`p-6 rounded-xl ${cat.color} hover:shadow-md transition-all group`}
                >
                  <span className="font-bold text-lg block">{cat.name}</span>
                  <span className="text-xs opacity-75 mt-1 block">Explore →</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-10 text-gray-500 text-sm">
            <p>
              Need help?{' '}
              <Link href="/help" className="text-[#1e3b8a] hover:underline font-semibold">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}