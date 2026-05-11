'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Product, Category } from '@/types';

interface Suggestions {
  products: Product[];
  categories: Category[];
  queries: string[];
}

export default function SearchAutocomplete({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({ products: [], categories: [], queries: [] });
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent queries from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('local-brand-recent-searches');
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions({ products: [], categories: [], queries: [] });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&suggest=1`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions({
            products: data.products?.slice(0, 5) || [],
            categories: data.categories?.slice(0, 3) || [],
            queries: data.suggestions?.slice(0, 5) || [],
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const submitSearch = (term: string) => {
    const q = term.trim();
    if (!q) return;
    // Save recent
    try {
      const updated = [q, ...recent.filter((r) => r !== q)].slice(0, 6);
      setRecent(updated);
      localStorage.setItem('local-brand-recent-searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(query);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search Brandy..."
            className="w-full px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#1e3b8a] focus:ring-2 focus:ring-[#1e3b8a]/20 outline-none text-sm transition-all"
            autoComplete="off"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {loading && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </form>

      {open && (query || recent.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {!query && recent.length > 0 && (
            <div className="p-3">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                Recent Searches
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    try { localStorage.removeItem('local-brand-recent-searches'); } catch { /* */ }
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 normal-case"
                >
                  Clear
                </button>
              </div>
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => submitSearch(r)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                >
                  <span className="text-gray-400">🕐</span>
                  {r}
                </button>
              ))}
            </div>
          )}

          {query && suggestions.products.length > 0 && (
            <div className="p-3 border-t border-gray-50">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Products
              </div>
              {suggestions.products.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {p.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{p.title}</div>
                    <div className="text-xs text-gray-400">
                      {p.basePrice.toLocaleString()} EGP
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {query && suggestions.categories.length > 0 && (
            <div className="p-3 border-t border-gray-50">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Categories
              </div>
              {suggestions.categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"
                >
                  <span className="text-gray-400">📁</span>
                  <span className="font-semibold">{c.name}</span>
                </Link>
              ))}
            </div>
          )}

          {query && !loading && suggestions.products.length === 0 && suggestions.categories.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">
              No matches for &quot;{query}&quot;
            </div>
          )}

          {query && (
            <div className="p-3 border-t border-gray-50">
              <button
                type="button"
                onClick={() => submitSearch(query)}
                className="w-full px-3 py-2 text-sm text-[#1e3b8a] font-bold hover:bg-gray-50 rounded-lg text-left flex items-center gap-2"
              >
                <span>🔍</span>
                Search for &quot;{query}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
