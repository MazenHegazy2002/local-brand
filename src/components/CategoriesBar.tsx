'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageContext';
import {
  ElectronicsIcon, FashionIcon, HomeIcon, HealthIcon, SportsIcon, GroceryIcon,
  AccessoriesIcon, AppliancesIcon, AutoIcon, BeautyIcon, BooksIcon, FootwearIcon,
  FurnitureIcon, GardenIcon, JewelryIcon, KidsIcon, MenIcon, PetsIcon, PharmaIcon,
  ToysIcon, WomenIcon,
} from './icons';
import type { Category } from '@/types';

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase().trim();
  // Exact-name matches first (covers the 20 standard categories)
  if (lower === 'accessories')                              return <AccessoriesIcon />;
  if (lower === 'appliances')                               return <AppliancesIcon />;
  if (lower === 'auto')                                     return <AutoIcon />;
  if (lower === 'beauty')                                   return <BeautyIcon />;
  if (lower === 'books')                                    return <BooksIcon />;
  if (lower === 'electronics')                              return <ElectronicsIcon />;
  if (lower === 'footwear')                                 return <FootwearIcon />;
  if (lower === 'furniture')                                return <FurnitureIcon />;
  if (lower === 'garden')                                   return <GardenIcon />;
  if (lower === 'groceries' || lower === 'grocery')         return <GroceryIcon />;
  if (lower === 'health')                                   return <HealthIcon />;
  if (lower === 'home')                                     return <HomeIcon />;
  if (lower === 'jewelry' || lower === 'jewellery')         return <JewelryIcon />;
  if (lower === 'kids')                                     return <KidsIcon />;
  if (lower === 'men')                                      return <MenIcon />;
  if (lower === 'pets')                                     return <PetsIcon />;
  if (lower === 'pharma' || lower === 'pharmacy')           return <PharmaIcon />;
  if (lower === 'sports' || lower === 'sport')              return <SportsIcon />;
  if (lower === 'toys')                                     return <ToysIcon />;
  if (lower === 'women')                                    return <WomenIcon />;
  // Keyword fallbacks for custom / translated category names
  if (lower.includes('accessor') || lower.includes('watch') || lower.includes('bag')) return <AccessoriesIcon />;
  if (lower.includes('applian') || lower.includes('machine'))                          return <AppliancesIcon />;
  if (lower.includes('auto') || lower.includes('car') || lower.includes('vehicle'))   return <AutoIcon />;
  if (lower.includes('beaut') || lower.includes('cosmetic') || lower.includes('makeup')) return <BeautyIcon />;
  if (lower.includes('book') || lower.includes('novel') || lower.includes('magazine')) return <BooksIcon />;
  if (lower.includes('electron') || lower.includes('phone') || lower.includes('laptop')) return <ElectronicsIcon />;
  if (lower.includes('footwear') || lower.includes('shoe') || lower.includes('boot') || lower.includes('sandal')) return <FootwearIcon />;
  if (lower.includes('furni') || lower.includes('sofa') || lower.includes('chair'))   return <FurnitureIcon />;
  if (lower.includes('garden') || lower.includes('plant') || lower.includes('flower')) return <GardenIcon />;
  if (lower.includes('grocer') || lower.includes('food') || lower.includes('supermarket')) return <GroceryIcon />;
  if (lower.includes('health') || lower.includes('wellness') || lower.includes('fitness')) return <HealthIcon />;
  if (lower.includes('home') || lower.includes('decor') || lower.includes('kitchen'))  return <HomeIcon />;
  if (lower.includes('jewel') || lower.includes('ring') || lower.includes('necklace')) return <JewelryIcon />;
  if (lower.includes('kid') || lower.includes('child') || lower.includes('baby'))      return <KidsIcon />;
  if (lower.includes('men') || lower.includes('shirt') || lower.includes('trouser'))   return <MenIcon />;
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat'))         return <PetsIcon />;
  if (lower.includes('pharm') || lower.includes('medicine') || lower.includes('drug')) return <PharmaIcon />;
  if (lower.includes('sport') || lower.includes('gym') || lower.includes('exercise'))  return <SportsIcon />;
  if (lower.includes('toy') || lower.includes('game') || lower.includes('play'))       return <ToysIcon />;
  if (lower.includes('women') || lower.includes('woman') || lower.includes('lady') || lower.includes('dress')) return <WomenIcon />;
  // Final fallback
  return <GroceryIcon />;
}

export default function CategoriesBar() {
  const [categories, setCategories] = useState<Category[]>([]);
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
          {categories.map((category: Category & { _count?: { products: number } }) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0f4f8] hover:bg-[#1e3b8a] hover:text-white text-gray-700 text-xs md:text-sm font-semibold transition-all whitespace-nowrap border border-transparent hover:border-[#1e3b8a]/20"
            >
              <span className="text-[#1e3b8a] group-hover:text-white transition-colors">
                {getCategoryIcon(category.name)}
              </span>
              <span>{category.name}</span>
              {(category._count?.products ?? 0) > 0 && (
                <span className="text-[10px] text-gray-400 group-hover:text-white/70">
                  ({category._count?.products})
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