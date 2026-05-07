'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageContext';
import { ElectronicsIcon, FashionIcon, HomeIcon, HealthIcon, SportsIcon, GroceryIcon } from './icons';

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('electronic') || lower.includes('phone') || lower.includes('laptop') || lower.includes('computer')) return <ElectronicsIcon />;
  if (lower.includes('fashion') || lower.includes('clothing') || lower.includes('apparel') || lower.includes('dress') || lower.includes(' shoes') || lower.includes('watch')) return <FashionIcon />;
  if (lower.includes('home') || lower.includes('furniture') || lower.includes('decor') || lower.includes('kitchen')) return <HomeIcon />;
  if (lower.includes('health') || lower.includes('beauty') || lower.includes('beauty')) return <HealthIcon />;
  if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym')) return <SportsIcon />;
  if (lower.includes('grocery') || lower.includes('food') || lower.includes('supermarket')) return <GroceryIcon />;
  return <ElectronicsIcon />;
}

export default function CategoriesBar() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex gap-8 py-3 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 w-20 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-gray-100 sticky top-[65px] z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 md:gap-2 py-2.5 overflow-x-auto scrollbar-hide">
          {categories.map((category: any) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0f4f8] hover:bg-[#1e3b8a] hover:text-white text-gray-700 text-xs md:text-sm font-semibold transition-all whitespace-nowrap border border-transparent hover:border-[#1e3b8a]/20"
            >
              <span className="text-[#1e3b8a] group-hover:text-white transition-colors">
                {getCategoryIcon(category.name)}
              </span>
              <span>{category.name}</span>
              {category._count?.products > 0 && (
                <span className="text-[10px] text-gray-400 group-hover:text-white/70">
                  ({category._count.products})
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}