'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageContext";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=2500&auto=format&fit=crop"
];

export default function Hero() {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#f5f3f0] py-6 pb-2">
      <div className="container mx-auto px-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[480px]">
          
          {/* Main Hero Card (Left) with Slider */}
          <div className="relative w-full h-[480px] lg:col-span-2 rounded-xl overflow-hidden bg-[#032094]">
            {HERO_IMAGES.map((src, idx) => (
              <Image 
                key={src}
                src={src} 
                alt={`Hero Background ${idx + 1}`} 
                layout="fill" 
                objectFit="cover" 
                className={`z-0 mix-blend-multiply transition-opacity duration-1000 ${currentSlide === idx ? 'opacity-100' : 'opacity-0'}`}
                priority={idx === 0}
              />
            ))}
            {/* Deep Blue Overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#032094]/90 to-[#0d5eed]/70 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 z-20 bg-gradient-to-tr from-[#021051] via-transparent to-transparent pointer-events-none" />
            
            {/* Slider Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2">
              {HERO_IMAGES.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${currentSlide === idx ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
            
            {/* Content */}
            <div className="absolute inset-0 z-30 flex flex-col justify-center px-10 md:px-14 text-white pointer-events-none">
              <div className="pointer-events-auto">
                <span className="text-[11px] md:text-xs tracking-[0.1em] font-medium text-white/80 mb-3 uppercase block">
                  {t("HeroSubtitle") || "Premium Collection"}
                </span>
                <h1 className="text-5xl md:text-[64px] font-bold tracking-tight mb-8 max-w-xl leading-[1.05]">
                  {t("HeroTitle") || "Discover Authentic Local Brands"}
                </h1>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/shop" className="bg-[#fa9f00] hover:bg-[#e08e00] text-[#4d2800] font-black tracking-wide py-3 px-8 rounded-lg transition-colors text-center text-sm">
                    {t("ShopNow") || "Shop Now"}
                  </Link>
                  <Link href="/lookbook" className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/80 text-white font-bold tracking-wide py-3 px-8 rounded-lg transition-colors text-center text-sm shadow-inner">
                    {t("ExploreLookbook") || "Explore Lookbook"}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Stacked Cards */}
          <div className="flex flex-col gap-4 lg:col-span-1 h-[480px]">
            {/* Top Right Card */}
            <Link href="/shoes" className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer">
              <Image src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop" layout="fill" objectFit="cover" alt="Sneaker" className="z-0 grayscale contrast-125" />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">{t("NextGenFootwear" as any) || "Next-Gen Footwear"}</h3>
                <span className="text-white/70 text-sm font-medium">Up to 40% Off Brands</span>
              </div>
            </Link>

            {/* Bottom Right Card */}
            <Link href="/watches" className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer">
              <Image src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop" layout="fill" objectFit="cover" alt="Watch" className="z-0 object-center" />
              <div className="absolute inset-0 z-10 bg-[#3a2c1f]/50 mix-blend-multiply" />
              <div className="absolute inset-0 z-15 bg-gradient-to-t from-[#2a1a0f] to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">{t("TimelessDesign" as any) || "Timeless Design"}</h3>
                <span className="text-white/70 text-sm font-medium">Curated Accessories</span>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
