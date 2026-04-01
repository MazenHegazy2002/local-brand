import Link from "next/link";
import Image from "next/image";
import { getDictionary } from "@/lib/i18n/server";

export default async function Hero() {
  const dict = await getDictionary();
  return (
    <section className="bg-[#f5f3f0] py-6 pb-2">
      <div className="container mx-auto px-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[480px]">
          
          {/* Main Hero Card (Left) */}
          <div className="relative w-full h-[480px] lg:col-span-2 rounded-xl overflow-hidden">
            <Image 
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2500&auto=format&fit=crop" 
              alt="Hero Background" 
              layout="fill" 
              objectFit="cover" 
              className="z-0 mix-blend-multiply"
              priority
            />
            {/* Deep Blue Overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#032094]/90 to-[#0d5eed]/70 mix-blend-multiply" />
            <div className="absolute inset-0 z-20 bg-gradient-to-tr from-[#021051] via-transparent to-transparent" />
            
            {/* Content */}
            <div className="absolute inset-0 z-30 flex flex-col justify-center px-10 md:px-14 text-white">
              <span className="text-[11px] md:text-xs tracking-[0.1em] font-medium text-white/80 mb-3 uppercase">
                {dict.HeroSubtitle}
              </span>
              <h1 className="text-5xl md:text-[64px] font-bold tracking-tight mb-8 max-w-xl leading-[1.05]">
                {dict.HeroTitle}
              </h1>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/shop" className="bg-[#fa9f00] hover:bg-[#e08e00] text-[#4d2800] font-black tracking-wide py-3 px-8 rounded-lg transition-colors text-center text-sm">
                  {dict.ShopNow}
                </Link>
                <Link href="/lookbook" className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/80 text-white font-bold tracking-wide py-3 px-8 rounded-lg transition-colors text-center text-sm shadow-inner">
                  {dict.ExploreLookbook}
                </Link>
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
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">{dict.NextGenFootwear}</h3>
                <span className="text-white/70 text-sm font-medium">Up to 40% Off Brands</span>
              </div>
            </Link>

            {/* Bottom Right Card */}
            <Link href="/watches" className="relative flex-1 rounded-xl overflow-hidden group block cursor-pointer">
              <Image src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop" layout="fill" objectFit="cover" alt="Watch" className="z-0 object-center" />
              <div className="absolute inset-0 z-10 bg-[#3a2c1f]/50 mix-blend-multiply" />
              <div className="absolute inset-0 z-15 bg-gradient-to-t from-[#2a1a0f] to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">{dict.TimelessDesign}</h3>
                <span className="text-white/70 text-sm font-medium">Curated Accessories</span>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
