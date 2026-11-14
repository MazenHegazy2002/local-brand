import { Metadata } from 'next';
import Link from 'next/link';
import { getServerTr } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'EAT — Food & Supermarkets | BRANDY',
  description:
    'Order delicious food from local restaurants, home cooks, and supermarkets. Fast delivery across Egypt.',
};

export default async function EatPage() {
  const tr = await getServerTr();

  return (
    <main className="min-h-screen bg-white">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8">
        {/* Decorative food emojis */}
        <div
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="absolute left-[8%] top-[12%] text-5xl opacity-20 sm:text-7xl">🍕</span>
          <span className="absolute right-[10%] top-[8%] text-4xl opacity-20 sm:text-6xl">🍔</span>
          <span className="absolute bottom-[18%] left-[15%] text-4xl opacity-20 sm:text-6xl">
            🍟
          </span>
          <span className="absolute bottom-[12%] right-[12%] text-5xl opacity-20 sm:text-7xl">
            🥗
          </span>
          <span className="absolute right-[35%] top-[22%] text-3xl opacity-15 sm:text-5xl">🍰</span>
          <span className="absolute bottom-[30%] left-[40%] text-3xl opacity-15 sm:text-5xl">
            🌮
          </span>
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            {tr('🔥 BRANDY EAT')}
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {tr('Delicious food, delivered fast')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90 sm:text-xl">
            {tr('Restaurants, home cooks, and supermarkets — all in one app. Order now and enjoy!')}
          </p>

          {/* Search bar (static, no onClick needed — links to /search) */}
          <div className="mx-auto mt-8 max-w-xl">
            <Link
              href="/search?context=eat"
              className="flex items-center gap-3 rounded-full bg-white px-5 py-3.5 text-gray-500 shadow-xl transition-shadow hover:shadow-2xl sm:px-6 sm:py-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 shrink-0 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>
              <span className="text-sm sm:text-base">{tr('What are you craving?')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Categories Row ─── */}
      <section className="-mt-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:gap-4 sm:justify-center sm:flex-wrap">
            {[
              { emoji: '🍽️', label: tr('Restaurants') },
              { emoji: '🏠', label: tr('Home Cooking') },
              { emoji: '🛍️', label: tr('Pickup') },
              { emoji: '🛒', label: tr('Supermarket') },
              { emoji: '🥦', label: tr('Healthy Boxes') },
              { emoji: '📦', label: tr('Get Me') },
            ].map(cat => (
              <Link
                key={cat.label}
                href={`/eat#${encodeURIComponent(cat.label)}`}
                className="flex shrink-0 flex-col items-center gap-2 rounded-2xl bg-white px-5 py-4 shadow-lg transition-transform hover:scale-105 sm:px-6 sm:py-5"
              >
                <span className="text-3xl sm:text-4xl">{cat.emoji}</span>
                <span className="whitespace-nowrap text-xs font-semibold text-gray-700 sm:text-sm">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Cuisines ─── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {tr('Explore Cuisines')}
          </h2>
          <p className="mb-10 text-center text-gray-500">
            {tr('From classic Egyptian dishes to international favorites')}
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { name: tr('Egyptian'), emoji: '🧆', from: 'from-emerald-500', to: 'to-teal-600' },
              { name: tr('Fast Food'), emoji: '🍔', from: 'from-red-500', to: 'to-orange-500' },
              { name: tr('Grills'), emoji: '🥩', from: 'from-amber-600', to: 'to-yellow-500' },
              { name: tr('Seafood'), emoji: '🦐', from: 'from-blue-500', to: 'to-cyan-500' },
              { name: tr('Desserts'), emoji: '🍰', from: 'from-pink-500', to: 'to-rose-500' },
              { name: tr('Oriental'), emoji: '🥘', from: 'from-purple-500', to: 'to-indigo-500' },
            ].map(cuisine => (
              <Link
                key={cuisine.name}
                href={`/eat#${encodeURIComponent(cuisine.name)}`}
                className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br ${cuisine.from} ${cuisine.to} p-6 text-white shadow-md transition-transform hover:scale-105 sm:p-8`}
              >
                <span className="text-4xl sm:text-5xl">{cuisine.emoji}</span>
                <span className="text-sm font-bold sm:text-base">{cuisine.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {tr('How It Works')}
          </h2>
          <p className="mb-12 text-center text-gray-500">
            {tr('Three easy steps to enjoy your meal')}
          </p>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: tr('Browse'),
                desc: tr('Explore restaurants, home cooks, and supermarkets near you.'),
                emoji: '🔍',
              },
              {
                step: '2',
                title: tr('Order'),
                desc: tr('Add items to your cart and checkout securely.'),
                emoji: '🛒',
              },
              {
                step: '3',
                title: tr('Enjoy'),
                desc: tr('Sit back and get your food delivered to your door.'),
                emoji: '🎉',
              },
            ].map(s => (
              <div key={s.step} className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-2xl font-extrabold text-white shadow-lg">
                    {s.step}
                  </div>
                  <span className="absolute -right-2 -top-2 text-2xl">{s.emoji}</span>
                </div>
                <h3 className="mb-1 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Highlights ─── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {tr('Why BRANDY EAT?')}
          </h2>
          <p className="mb-10 text-center text-gray-500">
            {tr('More than just delivery — a complete food experience')}
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: '⚡',
                title: tr('30-Min Delivery'),
                desc: tr('Lightning-fast delivery from nearby restaurants and stores.'),
                color: 'bg-amber-50 border-amber-200',
              },
              {
                emoji: '🛡️',
                title: tr('Allergy Filter'),
                desc: tr('Filter menus by allergens so you eat safely, every time.'),
                color: 'bg-green-50 border-green-200',
              },
              {
                emoji: '🪑',
                title: tr('Table Reservations'),
                desc: tr('Book tables at your favorite restaurants in seconds.'),
                color: 'bg-blue-50 border-blue-200',
              },
              {
                emoji: '🎒',
                title: tr('School Lunch Delivery'),
                desc: tr('Healthy, scheduled lunch deliveries straight to your kids\u2019 school.'),
                color: 'bg-purple-50 border-purple-200',
              },
              {
                emoji: '👩‍🍳',
                title: tr('Home Cooks Marketplace'),
                desc: tr('Discover talented home cooks serving authentic homemade meals.'),
                color: 'bg-rose-50 border-rose-200',
              },
              {
                emoji: '📱',
                title: tr('Real-Time Tracking'),
                desc: tr('Track your order from kitchen to doorstep, live on the map.'),
                color: 'bg-orange-50 border-orange-200',
              },
            ].map(h => (
              <div
                key={h.title}
                className={`rounded-2xl border ${h.color} p-6 transition-shadow hover:shadow-md`}
              >
                <span className="mb-3 inline-block text-3xl">{h.emoji}</span>
                <h3 className="mb-1 text-lg font-bold text-gray-900">{h.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Restaurant / Cook Signup CTA ─── */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{tr('Partner with BRANDY EAT')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            {tr(
              'Whether you own a restaurant or cook from home — reach thousands of hungry customers and grow your business.'
            )}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/become-seller"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-orange-600 shadow-lg transition-transform hover:scale-105"
            >
              🍳 {tr('Register as a Home Cook')}
            </Link>
            <Link
              href="/become-seller"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-transform hover:scale-105"
            >
              🏪 {tr('Register Your Restaurant')}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Coming Soon Banner ─── */}
      <section className="bg-gray-900 px-4 py-14 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-semibold text-amber-400">
            {tr('Coming Soon')}
          </span>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {tr('BRANDY EAT is launching soon!')}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-gray-400">
            {tr(
              "We're putting the final touches on an amazing food delivery experience. Stay tuned for something delicious."
            )}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 text-4xl">
            <span>🍕</span>
            <span>🍔</span>
            <span>🍟</span>
            <span>🥗</span>
            <span>🍰</span>
            <span>🧆</span>
          </div>
        </div>
      </section>
    </main>
  );
}
