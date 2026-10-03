'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/providers/LanguageContext';
import type { DictKey } from '@/lib/i18n/dicts';

export interface RightBannerSlide {
  imageUrl: string;
  title: string;
  subtitle: string | null;
  linkUrl: string;
  isI18nKey?: boolean;
}

const coverStyle = { objectFit: 'cover' as const };

const SLIDE_INTERVAL_MS = 5000;

export default function RightBannerSlider({ slides }: { slides: RightBannerSlide[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();
  const renderText = (value: string, isKey?: boolean) => (isKey ? t(value as DictKey) : value);

  useEffect(() => {
    if (currentSlide >= slides.length) setCurrentSlide(0);
  }, [slides.length, currentSlide]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const advance = () => {
      if (document.visibilityState === 'visible') {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }
    };

    const timer = setInterval(advance, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      {slides.map((slide, idx) => (
        <Link
          key={`${slide.imageUrl}-${idx}`}
          href={slide.linkUrl}
          className={`absolute inset-0 rounded-xl overflow-hidden group block cursor-pointer transition-opacity duration-1000 ${
            currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <Image
            src={slide.imageUrl}
            fill
            sizes="(max-width: 1024px) 50vw, 17vw"
            style={coverStyle}
            alt={renderText(slide.title, slide.isI18nKey)}
            className="z-0"
            priority={false}
            loading="lazy"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 z-20 w-full text-left">
            <h2 className="text-white text-xl md:text-2xl font-bold mb-1 tracking-tight">
              {renderText(slide.title, slide.isI18nKey)}
            </h2>
            {slide.subtitle && (
              <span className="text-white/70 text-sm font-medium">
                {renderText(slide.subtitle, slide.isI18nKey)}
              </span>
            )}
          </div>
        </Link>
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-0.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className="p-2.5 flex items-center justify-center focus:outline-none"
            >
              <span
                className={`h-1.5 rounded-full transition-all block ${
                  currentSlide === idx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80 w-1.5'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
