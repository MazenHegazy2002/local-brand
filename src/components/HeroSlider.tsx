'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { DictKey } from '@/lib/i18n/dicts';
import { useLanguage } from '@/providers/LanguageContext';

export interface HeroSlide {
  imageUrl: string;
  title: string;
  subtitle: string | null;
  linkUrl: string;
  ctaLabel: string | null;
  /**
   * If `true`, `title` and `subtitle` are i18n dictionary keys to look up
   * via the language context. Used by the hardcoded fallback set so the
   * default copy stays translated.
   */
  isI18nKey?: boolean;
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

const SLIDE_DURATION_MS = 5000;

export default function HeroSlider({ slides }: HeroSliderProps) {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance only when there's more than one slide.
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Reset the active slide if the slides array shrinks (e.g. an admin
  // unpublishes the one we're currently showing).
  useEffect(() => {
    if (currentSlide >= slides.length) setCurrentSlide(0);
  }, [slides.length, currentSlide]);

  if (slides.length === 0) return null;

  const renderText = (value: string, isKey?: boolean) => (isKey ? t(value as DictKey) : value);

  return (
    <>
      {slides.map((slide, idx) => (
        <Image
          key={`${slide.imageUrl}-${idx}`}
          src={slide.imageUrl}
          alt={renderText(slide.title, slide.isI18nKey)}
          fill
          sizes="(max-width: 1024px) 100vw, 67vw"
          style={{ objectFit: 'cover' }}
          className={`z-0 mix-blend-multiply transition-opacity duration-1000 ${currentSlide === idx ? 'opacity-100' : 'opacity-0'}`}
          priority={idx === 0}
        />
      ))}

      {/* Deep Blue Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#032094]/90 to-[#0d5eed]/70 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 z-20 bg-gradient-to-tr from-[#021051] via-transparent to-transparent pointer-events-none" />

      {/* Slider dots — only show when there's more than one slide */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${currentSlide === idx ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}

      {/* Active slide content */}
      {slides.map((slide, idx) => {
        if (idx !== currentSlide) return null;
        const title = renderText(slide.title, slide.isI18nKey);
        const subtitle = slide.subtitle ? renderText(slide.subtitle, slide.isI18nKey) : null;
        const ctaLabel = slide.ctaLabel || t('ShopNow');
        return (
          <div
            key={`content-${idx}`}
            className="absolute inset-0 z-30 flex flex-col justify-center px-5 sm:px-8 md:px-14 text-white pointer-events-none"
          >
            <div className="pointer-events-auto">
              {subtitle && (
                <span className="text-[10px] sm:text-[11px] md:text-xs tracking-[0.1em] font-medium text-white/80 mb-2 sm:mb-3 uppercase block">
                  {subtitle}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl md:text-[56px] lg:text-[64px] font-bold tracking-tight mb-4 sm:mb-6 md:mb-8 max-w-xl leading-[1.18]">
                {title}
              </h1>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={slide.linkUrl}
                  className="bg-[#fa9f00] hover:bg-[#e08e00] text-[#4d2800] font-black tracking-wide py-3 px-8 rounded-lg transition-colors text-center text-sm"
                >
                  {ctaLabel}
                </Link>
                <Link
                  href="/categories"
                  className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/80 text-white font-bold tracking-wide py-3 px-8 rounded-lg transition-colors text-center text-sm shadow-inner"
                >
                  {t('BrowseCategories')}
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
