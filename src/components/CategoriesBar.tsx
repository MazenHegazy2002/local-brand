'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageContext';
import {
  ElectronicsIcon,
  FashionIcon,
  HomeIcon,
  HealthIcon,
  SportsIcon,
  GroceryIcon,
  AccessoriesIcon,
  AppliancesIcon,
  AutoIcon,
  BeautyIcon,
  BooksIcon,
  FootwearIcon,
  FurnitureIcon,
  GardenIcon,
  JewelryIcon,
  KidsIcon,
  MenIcon,
  PetsIcon,
  PharmaIcon,
  ToysIcon,
  WomenIcon,
} from './icons';
import type { Category } from '@/types';

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase().trim();
  if (lower === 'accessories') return <AccessoriesIcon />;
  if (lower === 'appliances') return <AppliancesIcon />;
  if (lower === 'auto') return <AutoIcon />;
  if (lower === 'beauty') return <BeautyIcon />;
  if (lower === 'books') return <BooksIcon />;
  if (lower === 'electronics') return <ElectronicsIcon />;
  if (lower === 'footwear') return <FootwearIcon />;
  if (lower === 'furniture') return <FurnitureIcon />;
  if (lower === 'garden') return <GardenIcon />;
  if (lower === 'groceries' || lower === 'grocery') return <GroceryIcon />;
  if (lower === 'health') return <HealthIcon />;
  if (lower === 'home') return <HomeIcon />;
  if (lower === 'jewelry' || lower === 'jewellery') return <JewelryIcon />;
  if (lower === 'kids') return <KidsIcon />;
  if (lower === 'men') return <MenIcon />;
  if (lower === 'pets') return <PetsIcon />;
  if (lower === 'pharma' || lower === 'pharmacy') return <PharmaIcon />;
  if (lower === 'sports' || lower === 'sport') return <SportsIcon />;
  if (lower === 'toys') return <ToysIcon />;
  if (lower === 'women') return <WomenIcon />;
  if (lower.includes('accessor') || lower.includes('watch') || lower.includes('bag'))
    return <AccessoriesIcon />;
  if (lower.includes('applian') || lower.includes('machine')) return <AppliancesIcon />;
  if (lower.includes('auto') || lower.includes('car') || lower.includes('vehicle'))
    return <AutoIcon />;
  if (lower.includes('beaut') || lower.includes('cosmetic') || lower.includes('makeup'))
    return <BeautyIcon />;
  if (lower.includes('book') || lower.includes('novel') || lower.includes('magazine'))
    return <BooksIcon />;
  if (lower.includes('electron') || lower.includes('phone') || lower.includes('laptop'))
    return <ElectronicsIcon />;
  if (
    lower.includes('footwear') ||
    lower.includes('shoe') ||
    lower.includes('boot') ||
    lower.includes('sandal')
  )
    return <FootwearIcon />;
  if (lower.includes('furni') || lower.includes('sofa') || lower.includes('chair'))
    return <FurnitureIcon />;
  if (lower.includes('garden') || lower.includes('plant') || lower.includes('flower'))
    return <GardenIcon />;
  if (lower.includes('grocer') || lower.includes('food') || lower.includes('supermarket'))
    return <GroceryIcon />;
  if (lower.includes('health') || lower.includes('wellness') || lower.includes('fitness'))
    return <HealthIcon />;
  if (lower.includes('home') || lower.includes('decor') || lower.includes('kitchen'))
    return <HomeIcon />;
  if (lower.includes('jewel') || lower.includes('ring') || lower.includes('necklace'))
    return <JewelryIcon />;
  if (lower.includes('kid') || lower.includes('child') || lower.includes('baby'))
    return <KidsIcon />;
  if (lower.includes('men') || lower.includes('shirt') || lower.includes('trouser'))
    return <MenIcon />;
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) return <PetsIcon />;
  if (lower.includes('pharm') || lower.includes('medicine') || lower.includes('drug'))
    return <PharmaIcon />;
  if (lower.includes('sport') || lower.includes('gym') || lower.includes('exercise'))
    return <SportsIcon />;
  if (lower.includes('toy') || lower.includes('game') || lower.includes('play'))
    return <ToysIcon />;
  if (
    lower.includes('women') ||
    lower.includes('woman') ||
    lower.includes('lady') ||
    lower.includes('dress')
  )
    return <WomenIcon />;
  return <FashionIcon />;
}

// Distinct accent color per category so the bar feels alive on PC.
function getCategoryColor(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === 'electronics' || lower.includes('electron')) return '#0ea5e9';
  if (lower === 'fashion' || lower.includes('fashion')) return '#ec4899';
  if (lower === 'home' || lower.includes('home')) return '#a16207';
  if (lower === 'health' || lower.includes('health')) return '#10b981';
  if (lower === 'sports' || lower === 'sport' || lower.includes('sport')) return '#f59e0b';
  if (lower === 'groceries' || lower === 'grocery' || lower.includes('grocer')) return '#84cc16';
  if (lower === 'accessories' || lower.includes('accessor')) return '#8b5cf6';
  if (lower === 'appliances' || lower.includes('applian')) return '#0891b2';
  if (lower === 'auto' || lower.includes('auto')) return '#475569';
  if (lower === 'beauty' || lower.includes('beaut')) return '#f43f5e';
  if (lower === 'books' || lower.includes('book')) return '#6366f1';
  if (lower === 'footwear' || lower.includes('footwear') || lower.includes('shoe'))
    return '#7c3aed';
  if (lower === 'furniture' || lower.includes('furni')) return '#92400e';
  if (lower === 'garden' || lower.includes('garden')) return '#22c55e';
  if (lower === 'jewelry' || lower === 'jewellery' || lower.includes('jewel')) return '#d97706';
  if (lower === 'kids' || lower.includes('kid')) return '#06b6d4';
  if (lower === 'men' || lower.includes('men')) return '#1e3b8a';
  if (lower === 'pets' || lower.includes('pet')) return '#ea580c';
  if (lower === 'pharma' || lower === 'pharmacy' || lower.includes('pharm')) return '#dc2626';
  if (lower === 'toys' || lower.includes('toy')) return '#facc15';
  if (lower === 'women' || lower.includes('women')) return '#db2777';
  return '#1e3b8a';
}

export default function CategoriesBar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Underscore prefix because we don't currently use the dictionary in this component
  // but we may want to localise category names later.
  const _lang = useLanguage();

  // Static fallback shown when the DB has no categories yet (e.g. fresh production deploy).
  const FALLBACK_CATEGORIES: Category[] = [
    { id: 'accessories', name: 'Accessories', slug: 'accessories', parentId: null },
    { id: 'appliances', name: 'Appliances', slug: 'appliances', parentId: null },
    { id: 'auto', name: 'Auto', slug: 'auto', parentId: null },
    { id: 'beauty', name: 'Beauty', slug: 'beauty', parentId: null },
    { id: 'books', name: 'Books', slug: 'books', parentId: null },
    { id: 'electronics', name: 'Electronics', slug: 'electronics', parentId: null },
    { id: 'footwear', name: 'Footwear', slug: 'footwear', parentId: null },
    { id: 'furniture', name: 'Furniture', slug: 'furniture', parentId: null },
    { id: 'garden', name: 'Garden', slug: 'garden', parentId: null },
    { id: 'groceries', name: 'Groceries', slug: 'groceries', parentId: null },
    { id: 'health', name: 'Health', slug: 'health', parentId: null },
    { id: 'home', name: 'Home', slug: 'home', parentId: null },
    { id: 'jewelry', name: 'Jewelry', slug: 'jewelry', parentId: null },
    { id: 'kids', name: 'Kids', slug: 'kids', parentId: null },
    { id: 'men', name: 'Men', slug: 'men', parentId: null },
    { id: 'pets', name: 'Pets', slug: 'pets', parentId: null },
    { id: 'sports', name: 'Sports', slug: 'sports', parentId: null },
    { id: 'toys', name: 'Toys', slug: 'toys', parentId: null },
    { id: 'women', name: 'Women', slug: 'women', parentId: null },
    { id: 'pharma', name: 'Pharma', slug: 'pharma', parentId: null },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          const fetched: Category[] = data.categories || [];
          // Use DB categories if they exist, otherwise show static fallbacks
          setCategories(fetched.length > 0 ? fetched : FALLBACK_CATEGORIES);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (e) {
        console.error('Failed to fetch categories:', e);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftArrow(scrollLeft > 8);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, categories]);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="w-full bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex gap-8 py-3 overflow-x-auto">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-7 w-20 bg-gray-100 animate-pulse rounded-full" />
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
      <div className="container mx-auto px-4 relative">
        {/* Left arrow — only visible when there's content scrolled past */}
        <button
          type="button"
          onClick={() => scrollBy(-280)}
          aria-label="Scroll categories left"
          className={`hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white transition-all ${
            showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => scrollBy(280)}
          aria-label="Scroll categories right"
          className={`hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white transition-all ${
            showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
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
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-1 md:gap-2 py-2.5 overflow-x-auto scrollbar-hide md:px-10 scroll-smooth"
        >
          {categories.map((category: Category & { _count?: { products: number } }) => {
            const color = getCategoryColor(category.name);
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-700 text-xs md:text-sm font-semibold transition-all whitespace-nowrap border bg-[#f0f4f8] border-transparent hover:bg-[var(--cat-color)] hover:text-white hover:border-[var(--cat-color)]"
                style={{ ['--cat-color' as string]: color }}
              >
                <span style={{ color }} className="group-hover:text-white transition-colors">
                  {getCategoryIcon(category.name)}
                </span>
                <span>{category.name}</span>
                <span className="text-[10px] text-gray-400 group-hover:text-white/80">
                  ({category._count?.products ?? 0})
                </span>
              </Link>
            );
          })}
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
