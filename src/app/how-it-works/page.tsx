import Navbar from '@/components/Navbar';
import Link from 'next/link';

export const metadata = {
  title: 'How It Works — Brandy Marketplace',
  description:
    'Learn how Brandy connects Egyptian shoppers with local brands, and how local sellers list, sell, and grow their businesses.',
};

const SHOPPER_STEPS = [
  {
    step: '01',
    title: 'Discover Local Brands',
    desc: 'Browse thousands of curated fashion, streetwear, footwear, and accessories from authentic Egyptian sellers.',
    icon: '🛍️',
  },
  {
    step: '02',
    title: 'Seamless Order & Try-On',
    desc: 'Use AI Virtual Try-On to preview outfits, compare products, and add items to your cart with instant price calculations.',
    icon: '✨',
  },
  {
    step: '03',
    title: 'Flexible Payment Options',
    desc: 'Pay safely using Vodafone Cash, InstaPay, Credit/Debit cards via Stripe/PaySky, or Cash on Delivery (COD).',
    icon: '💳',
  },
  {
    step: '04',
    title: 'Fast Nationwide Delivery',
    desc: 'Track your package in real-time from the seller hub to your doorstep across Cairo, Alexandria, and all governorates.',
    icon: '🚚',
  },
];

const SELLER_STEPS = [
  {
    step: '01',
    title: 'Register Your Brand',
    desc: 'Apply in 2 minutes at /become-seller. Provide your store details and contact info for fast merchant verification.',
    icon: '📝',
  },
  {
    step: '02',
    title: 'List Products & Inventory',
    desc: 'Add individual products or upload bulk catalogs via Excel. Set prices, variants, stock, and high-resolution images.',
    icon: '📦',
  },
  {
    step: '03',
    title: 'Fulfill Orders & Engage',
    desc: 'Receive instant order notifications, print shipping labels, and respond to buyer questions directly from Seller Hub.',
    icon: '⚡',
  },
  {
    step: '04',
    title: 'Get Paid Weekly',
    desc: 'Track balance transparently. Escrow releases post-delivery and funds transfer straight to your bank account or wallet.',
    icon: '💵',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.06)] text-[hsl(var(--foreground))]">
      <Navbar />

      {/* Hero Header */}
      <section className="py-16 md:py-24 px-4 text-center max-w-4xl mx-auto">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] text-xs font-extrabold uppercase tracking-wider mb-4 border border-[hsl(var(--primary)/0.15)]">
          💡 How Brandy Works
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 leading-tight">
          Connecting Local Brands with <br />
          <span className="text-[hsl(var(--primary))]">Millions of Shoppers</span>
        </h1>
        <p className="mt-4 text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Brandy empowers Egyptian local sellers to build their digital storefronts while giving
          shoppers a unified, reliable platform to discover local craftsmanship.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/shop"
            className="px-6 py-3.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white font-bold rounded-xl text-sm transition-all shadow-md"
          >
            Start Shopping →
          </Link>
          <Link
            href="/become-seller"
            className="px-6 py-3.5 bg-white hover:bg-gray-50 text-[hsl(var(--primary))] font-bold rounded-xl text-sm border border-gray-200 transition-colors shadow-sm"
          >
            Become a Seller
          </Link>
        </div>
      </section>

      {/* For Shoppers Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">For Shoppers</h2>
          <p className="text-gray-500 text-sm mt-1">
            Simple, transparent, and enjoyable local shopping
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SHOPPER_STEPS.map((s, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              <div className="text-3xl mb-4 p-3 rounded-2xl bg-[hsl(var(--primary)/0.06)] w-fit border border-[hsl(var(--primary)/0.15)]">
                {s.icon}
              </div>
              <div>
                <span className="text-xs font-black text-[hsl(var(--primary))] tracking-wider">
                  STEP {s.step}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* For Sellers Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">
            For Sellers & Local Brands
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Grow your business with zero fixed monthly overhead
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SELLER_STEPS.map((s, idx) => (
            <div
              key={idx}
              className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              <div className="text-3xl mb-4 p-3 rounded-2xl bg-indigo-950/80 w-fit border border-indigo-800">
                {s.icon}
              </div>
              <div>
                <span className="text-xs font-black text-indigo-400 tracking-wider">
                  STEP {s.step}
                </span>
                <h3 className="text-lg font-bold text-white mt-1 mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-4">
          <h2 className="text-3xl font-black text-gray-900">Ready to Get Started?</h2>
          <p className="text-gray-600 text-sm max-w-lg mx-auto">
            Join thousands of satisfied shoppers and local brand owners selling nationwide on
            Brandy.
          </p>
          <div className="pt-2 flex justify-center gap-4">
            <Link
              href="/become-seller"
              className="px-8 py-3.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white font-bold rounded-xl text-sm transition-all shadow-md"
            >
              Join as a Seller →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-gray-500 text-xs">
        <p>© {new Date().getFullYear()} Brandy Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}
