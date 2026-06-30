'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface RightBannerSlide {
  imageUrl: string;
  title: string;
  subtitle: string | null;
  linkUrl: string;
}

export default function RightBannerSlider({ slides }: { slides: RightBannerSlide[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
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
            style={{ objectFit: 'cover' }}
            alt={slide.title}
            className="z-0"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 z-20 w-full text-left">
            <h3 className="text-white text-xl md:text-2xl font-bold mb-1 tracking-tight">
              {slide.title}
            </h3>
            {slide.subtitle && (
              <span className="text-white/70 text-sm font-medium">{slide.subtitle}</span>
            )}
          </div>
        </Link>
      ))}

      {/* Slider dots indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-30 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={e => {
                e.preventDefault();
                setCurrentSlide(idx);
              }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                currentSlide === idx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
