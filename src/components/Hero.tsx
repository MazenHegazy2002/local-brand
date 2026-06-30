import { prisma } from '@/lib/prisma';
import HeroSlider, { type HeroSlide } from './HeroSlider';
import RightBannerSlider, { type RightBannerSlide } from './RightBannerSlider';

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

const FALLBACK_RIGHT_TOP: RightBannerSlide[] = [
  {
    imageUrl:
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=75&w=600&auto=format&fit=crop',
    title: 'Next-Gen Footwear',
    subtitle: 'Up to 40% Off Brands',
    linkUrl: '/shoes',
  },
];

const FALLBACK_RIGHT_BOTTOM: RightBannerSlide[] = [
  {
    imageUrl:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=75&w=600&auto=format&fit=crop',
    title: 'Timeless Design',
    subtitle: 'Curated Accessories',
    linkUrl: '/watches',
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
    const rightTopBanners = banners.filter(b => b.position === 1);
    const rightBottomBanners = banners.filter(b => b.position === 2);

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
      rightTop:
        rightTopBanners.length > 0
          ? rightTopBanners.map(b => ({
              imageUrl: b.imageUrl,
              title: b.title,
              subtitle: b.subtitle,
              linkUrl: b.linkUrl,
            }))
          : FALLBACK_RIGHT_TOP,
      rightBottom:
        rightBottomBanners.length > 0
          ? rightBottomBanners.map(b => ({
              imageUrl: b.imageUrl,
              title: b.title,
              subtitle: b.subtitle,
              linkUrl: b.linkUrl,
            }))
          : FALLBACK_RIGHT_BOTTOM,
    };
  } catch (err) {
    console.error('[Hero] failed to load banners:', err);
    return {
      slider: FALLBACK_SLIDES,
      rightTop: FALLBACK_RIGHT_TOP,
      rightBottom: FALLBACK_RIGHT_BOTTOM,
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

          {/* Right-hand stacked cards — curatable sliders. */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:col-span-1 h-[180px] sm:h-[220px] lg:h-[480px]">
            <div className="relative flex-1 rounded-xl overflow-hidden group">
              <RightBannerSlider slides={rightTop} />
            </div>

            <div className="relative flex-1 rounded-xl overflow-hidden group">
              <RightBannerSlider slides={rightBottom} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
