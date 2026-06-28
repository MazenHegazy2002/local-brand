'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageContext';
import { debounce } from 'lodash';
import type { Product } from '@/types';

const RECENT_SEARCHES_KEY = 'recentSearches';

export default function LiveSearch() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Partial<Product>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
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
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search, debouncedSearch]);

  const handleSearch = (e: React.FormEvent, directQuery?: string) => {
    e.preventDefault();
    const query = directQuery || search.trim();
    if (query) {
      saveRecentSearch(query);
      router.push(`/shop?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        saveRecentSearch(search);
        router.push(`/product/${results[selectedIndex].id}`);
        setIsOpen(false);
      } else {
        handleSearch(e);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleRecentClick = (query: string) => {
    setSearch(query);
    router.push(`/shop?q=${encodeURIComponent(query)}`);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-[480px] mx-4 w-full">
      <form onSubmit={handleSearch} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (search.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('SearchPlaceholder')}
          className="w-full bg-white/15 border border-white/40 text-white placeholder:text-white/75 rounded-lg py-2.5 px-4 pr-10 outline-none text-sm focus:bg-white/25 focus:border-white/60 transition-all"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/85 hover:text-white transition-colors"
        >
          {isSearching ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </button>
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-slideDown">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : search.trim().length > 0 ? (
            results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto">
                {results.map((product, idx) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.id}`}
                      onClick={() => {
                        saveRecentSearch(search);
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${idx === selectedIndex ? 'bg-blue-50' : ''}`}
                    >
                      <div className="w-12 h-12 relative rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={
                            product.images?.[0]?.url ||
                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400'
                          }
                          fill
                          sizes="48px"
                          className="object-cover"
                          alt={product.title || 'Product'}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {product.title}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium">{product.basePrice} EGP</p>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-400 flex-shrink-0"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={e => handleSearch(e)}
                    className="w-full p-3 text-center text-sm text-[#1e3b8a] hover:bg-blue-50 font-bold transition-colors border-t border-gray-100"
                  >
                    View all results for "{search}"
                  </button>
                </li>
              </ul>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">No products found.</div>
            )
          ) : recentSearches.length > 0 ? (
            <div className="p-3">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-[#1e3b8a] hover:underline"
                >
                  Clear
                </button>
              </div>
              <ul>
                {recentSearches.map((rs, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleRecentClick(rs)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-400"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {rs}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
