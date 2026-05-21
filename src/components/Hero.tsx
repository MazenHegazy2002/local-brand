import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import HeroSlider, { type HeroSlide } from './HeroSlider';

// Hardcoded fallback shown when there are no active homepage banners in the
// database. Titles/subtitles are i18n dictionary keys so default copy
// translates correctly.
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2500&auto=format&fit=crop',
    title: 'HeroTitle',
    subtitle: 'HeroSubtitle',
    linkUrl: '/shop',
    ctaLabel: null,
    isI18nKey: true,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2500&auto=format&fit=crop',
    title: 'HeroTitle',
    subtitle: 'HeroSubtitle',
    linkUrl: '/shop',
    ctaLabel: null,
    isI18nKey: true,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=2500&auto=format&fit=crop',
    title: 'HeroTitle',
    subtitle: 'HeroSubtitle',
    linkUrl: '/shop',
    ctaLabel: null,
    isI18nKey: true,
  },
];

async function loadHeroSlides(): Promise<HeroSlide[]> {
  try {
    const now = new Date();
    const banners = await prisma.homepageBanner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      select: {
        title: true,
        subtitle: true,
        imageUrl: true,
        linkUrl: true,
        ctaLabel: true,
      },
    });
    if (banners.length === 0) return FALLBACK_SLIDES;
    return banners.map(b => ({
      imageUrl: b.imageUrl,
      title: b.title,
      subtitle: b.subtitle,
      linkUrl: b.linkUrl,
      ctaLabel: b.ctaLabel,
    }));
  } catch (err) {
    // DB unavailable during build / dev — just render the hardcoded set.
    console.error('[Hero] failed to load banners:', err);
    return FALLBACK_SLIDES;
  }
}

export default async function Hero() {
  const slides = await loadHeroSlides();

  return (
    <section className="bg-[#f5f3f0] py-6 pb-2">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[480px]">
          {/* Main hero — slider sourced from CMS banners or fallback set. */}
          <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[480px] lg:col-span-2 rounded-xl overflow-hidden bg-[#032094]">
            <HeroSlider slides={slides} />
          </div>

          {/* Right-hand stacked cards — static curated entry points to category
              pages. Easier to leave hardcoded than to mix into the CMS for now. */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:col-span-1 h-[180px] sm:h-[220px] lg:h-[480px]">
            <Link
              href="/shoes"
              className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer"
            >
              <Image
                src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop"
                fill
                style={{ objectFit: 'cover' }}
                alt="Sneaker"
                className="z-0 grayscale contrast-125"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">
                  Next-Gen Footwear
                </h3>
                <span className="text-white/70 text-sm font-medium">Up to 40% Off Brands</span>
              </div>
            </Link>

            <Link
              href="/watches"
              className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer"
            >
              <Image
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop"
                fill
                style={{ objectFit: 'cover' }}
                alt="Watch"
                className="z-0 object-center"
              />
              <div className="absolute inset-0 z-10 bg-[#3a2c1f]/50 mix-blend-multiply" />
              <div className="absolute inset-0 z-15 bg-gradient-to-t from-[#2a1a0f] to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">
                  Timeless Design
                </h3>
                <span className="text-white/70 text-sm font-medium">Curated Accessories</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
