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
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=75&w=1200&auto=format&fit=crop',
    title: 'HeroTitle',
    subtitle: 'HeroSubtitle',
    linkUrl: '/shop',
    ctaLabel: null,
    isI18nKey: true,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=75&w=1200&auto=format&fit=crop',
    title: 'HeroTitle',
    subtitle: 'HeroSubtitle',
    linkUrl: '/shop',
    ctaLabel: null,
    isI18nKey: true,
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=75&w=1200&auto=format&fit=crop',
    title: 'HeroTitle',
    subtitle: 'HeroSubtitle',
    linkUrl: '/shop',
    ctaLabel: null,
    isI18nKey: true,
  },
];

async function loadBanners() {
  try {
    const now = new Date();
    const banners = await prisma.homepageBanner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    const sliderBanners = banners.filter(b => b.position === 0 || b.position < 0 || b.position > 2);
    const rightTopBanner = banners.find(b => b.position === 1) || null;
    const rightBottomBanner = banners.find(b => b.position === 2) || null;

    return {
      slider:
        sliderBanners.length > 0
          ? sliderBanners.map(b => ({
              imageUrl: b.imageUrl,
              title: b.title,
              subtitle: b.subtitle,
              linkUrl: b.linkUrl,
              ctaLabel: b.ctaLabel,
            }))
          : FALLBACK_SLIDES,
      rightTop: rightTopBanner
        ? {
            imageUrl: rightTopBanner.imageUrl,
            title: rightTopBanner.title,
            subtitle: rightTopBanner.subtitle,
            linkUrl: rightTopBanner.linkUrl,
            ctaLabel: rightTopBanner.ctaLabel,
          }
        : {
            imageUrl:
              'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=75&w=600&auto=format&fit=crop',
            title: 'Next-Gen Footwear',
            subtitle: 'Up to 40% Off Brands',
            linkUrl: '/shoes',
            ctaLabel: null,
          },
      rightBottom: rightBottomBanner
        ? {
            imageUrl: rightBottomBanner.imageUrl,
            title: rightBottomBanner.title,
            subtitle: rightBottomBanner.subtitle,
            linkUrl: rightBottomBanner.linkUrl,
            ctaLabel: rightBottomBanner.ctaLabel,
          }
        : {
            imageUrl:
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=75&w=600&auto=format&fit=crop',
            title: 'Timeless Design',
            subtitle: 'Curated Accessories',
            linkUrl: '/watches',
            ctaLabel: null,
          },
    };
  } catch (err) {
    console.error('[Hero] failed to load banners:', err);
    return {
      slider: FALLBACK_SLIDES,
      rightTop: {
        imageUrl:
          'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=75&w=600&auto=format&fit=crop',
        title: 'Next-Gen Footwear',
        subtitle: 'Up to 40% Off Brands',
        linkUrl: '/shoes',
        ctaLabel: null,
      },
      rightBottom: {
        imageUrl:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=75&w=600&auto=format&fit=crop',
        title: 'Timeless Design',
        subtitle: 'Curated Accessories',
        linkUrl: '/watches',
        ctaLabel: null,
      },
    };
  }
}

export default async function Hero() {
  const { slider, rightTop, rightBottom } = await loadBanners();

  return (
    <section className="bg-[#f5f3f0] py-6 pb-2">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[480px]">
          {/* Main hero — slider sourced from CMS banners or fallback set. */}
          <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[480px] lg:col-span-2 rounded-xl overflow-hidden bg-[#032094]">
            <HeroSlider slides={slider} />
          </div>

          {/* Right-hand stacked cards — static curated entry points to category
              pages. Easier to leave hardcoded than to mix into the CMS for now. */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:col-span-1 h-[180px] sm:h-[220px] lg:h-[480px]">
            <Link
              href={rightTop.linkUrl}
              className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer"
            >
              <Image
                src={rightTop.imageUrl}
                fill
                sizes="(max-width: 1024px) 50vw, 17vw"
                style={{ objectFit: 'cover' }}
                alt={rightTop.title}
                className="z-0"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
                <h3 className="text-white text-xl md:text-2xl font-bold mb-1 tracking-tight">
                  {rightTop.title}
                </h3>
                <span className="text-white/70 text-sm font-medium">{rightTop.subtitle}</span>
              </div>
            </Link>

            <Link
              href={rightBottom.linkUrl}
              className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer"
            >
              <Image
                src={rightBottom.imageUrl}
                fill
                sizes="(max-width: 1024px) 50vw, 17vw"
                style={{ objectFit: 'cover' }}
                alt={rightBottom.title}
                className="z-0"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/90 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
                <h3 className="text-white text-xl md:text-2xl font-bold mb-1 tracking-tight">
                  {rightBottom.title}
                </h3>
                <span className="text-white/70 text-sm font-medium">{rightBottom.subtitle}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
