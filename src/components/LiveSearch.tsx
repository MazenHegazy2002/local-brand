'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageContext';

export default function LiveSearch() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(search)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
          setIsOpen(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/shop?q=${encodeURIComponent(search.trim())}`);
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-[480px] mx-4 w-full">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => { if (search.trim()) setIsOpen(true); }}
          placeholder={t("SearchPlaceholder")}
          className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-lg py-2 px-4 pr-10 outline-none text-sm focus:bg-white/15 transition-colors"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </form>

      {isOpen && (search.trim().length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((product) => (
                <li key={product.id}>
                  <Link 
                    href={`/product/${product.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 relative rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image 
                        src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400'} 
                        layout="fill" 
                        objectFit="cover" 
                        alt={product.title} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{product.title}</h4>
                      <p className="text-xs text-gray-500 font-medium">{product.basePrice} EGP</p>
                    </div>
                  </Link>
                </li>
              ))}
              <li>
                <button 
                  onClick={handleSearch}
                  className="w-full p-3 text-center text-sm text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                >
                  View all results for "{search}"
                </button>
              </li>
            </ul>
          ) : (
             <div className="p-4 text-center text-sm text-gray-500">No products found.</div>
          )}
        </div>
      )}
    </div>
  );
}
