import { Metadata } from 'next';
import Link from 'next/link';
import { getServerTr } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'BRANDY GO — Mobility & Logistics',
  description:
    'Your ride, your way. Book rides, city-to-city trips, towing, moving, package delivery & luxury rides with BRANDY GO.',
};

const services = [
  { emoji: '🚗', name: 'Rides', desc: 'Everyday A→B rides across town' },
  { emoji: '🛣️', name: 'City-to-City', desc: 'Intercity travel, fixed prices' },
  { emoji: '🚜', name: 'Towing (ونش)', desc: 'Roadside rescue in minutes' },
  { emoji: '🚚', name: 'Moving (نقل عفش)', desc: 'Furniture & apartment moves' },
  { emoji: '📦', name: 'Package Delivery', desc: 'Same-day parcel courier' },
  { emoji: '✨', name: 'Luxury', desc: 'Premium cars, VIP service' },
];

const steps = [
  { num: 1, title: 'Book', desc: 'Enter pickup & destination, pick a service.' },
  { num: 2, title: 'Track', desc: 'Watch your driver arrive in real time on the map.' },
  { num: 3, title: 'Arrive', desc: 'Enjoy the ride. Pay cashless or cash — your choice.' },
];

const features = [
  { emoji: '🚘', title: 'Modern 2019+ Cars', desc: 'Only late-model, well-maintained vehicles.' },
  { emoji: '📍', title: 'GPS Tracking', desc: 'Live location sharing with family & friends.' },
  { emoji: '🍔', title: 'MealWay', desc: 'Order food & have it waiting at your destination.' },
  { emoji: '🍫', title: 'Snack in Every Ride', desc: 'Complimentary water & snacks on board.' },
  {
    emoji: '👥',
    title: '4ela Back (Shared)',
    desc: 'Share your route, split the fare, save more.',
  },
  { emoji: '⚡', title: 'Fast Delivery', desc: 'Send anything across the city in under an hour.' },
];

export default async function GoPage() {
  const tr = await getServerTr();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-950">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 py-24 lg:flex-row lg:py-36">
          {/* copy */}
          <div className="flex-1 text-center lg:text-left">
            <span className="mb-4 inline-block rounded-full bg-emerald-500/20 px-4 py-1 text-sm font-medium text-emerald-300">
              {tr('BRANDY GO')}
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {tr('Your ride,')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {tr('your way')}
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-gray-300">
              {tr('Book a ride in seconds. Track your driver live. Arrive safely — every time.')}
            </p>

            {/* quick-book form (static, no JS) */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400">
                  📍
                </span>
                <input
                  type="text"
                  readOnly
                  placeholder={tr('Pickup location')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-400 backdrop-blur"
                />
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400">🏁</span>
                <input
                  type="text"
                  readOnly
                  placeholder={tr('Dropoff location')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-400 backdrop-blur"
                />
              </div>
              <Link
                href="/go"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                {tr('Request Ride')} →
              </Link>
            </div>
          </div>

          {/* illustration – CSS/SVG car on a road */}
          <div className="relative flex flex-1 items-center justify-center">
            <div className="relative h-64 w-64 sm:h-80 sm:w-80">
              {/* road */}
              <div className="absolute bottom-8 left-0 right-0 h-3 rounded-full bg-gray-700" />
              <div className="absolute bottom-[34px] left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-yellow-400/60" />
              {/* car body */}
              <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center">
                <span className="text-7xl drop-shadow-[0_0_24px_rgba(16,185,129,0.6)]">🚗</span>
              </div>
              {/* map pin */}
              <div className="absolute left-1/2 top-6 -translate-x-1/2">
                <span className="text-5xl animate-bounce">📍</span>
              </div>
              {/* glow ring */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
              <div className="absolute inset-4 rounded-full border border-teal-400/10" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Service Categories ─── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">{tr('Our Services')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-400">
          {tr('Everything you need to move — yourself or your stuff.')}
        </p>

        <div className="mt-12 flex gap-5 overflow-x-auto pb-4 scrollbar-none">
          {services.map(s => (
            <div
              key={s.name}
              className="flex min-w-[200px] shrink-0 flex-col items-center rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur transition hover:border-emerald-500/30 hover:bg-white/[0.06]"
            >
              <span className="text-4xl">{s.emoji}</span>
              <h3 className="mt-4 text-lg font-semibold">{tr(s.name)}</h3>
              <p className="mt-2 text-center text-sm text-gray-400">{tr(s.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-t border-white/5 bg-gray-900/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{tr('How It Works')}</h2>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-2xl font-bold text-emerald-400">
                  {s.num}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden h-0.5 w-full bg-gradient-to-r from-emerald-500/40 to-transparent sm:absolute sm:block" />
                )}
                <h3 className="mt-5 text-xl font-semibold">{tr(s.title)}</h3>
                <p className="mt-2 text-sm text-gray-400">{tr(s.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">{tr('Why BRANDY GO')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-400">
          {tr('We obsess over every detail of your journey.')}
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition hover:border-emerald-500/30 hover:bg-white/[0.05]"
            >
              <span className="text-3xl">{f.emoji}</span>
              <h3 className="mt-4 text-lg font-semibold group-hover:text-emerald-400">
                {tr(f.title)}
              </h3>
              <p className="mt-2 text-sm text-gray-400">{tr(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Driver Signup CTA ─── */}
      <section className="border-t border-white/5 bg-gradient-to-r from-emerald-900/40 to-teal-900/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center lg:flex-row lg:text-left">
          <div className="flex-1">
            <h2 className="text-3xl font-bold sm:text-4xl">{tr('Drive with BRANDY GO')}</h2>
            <p className="mt-4 text-gray-300">
              {tr(
                'Set your own hours. Earn on your terms. Join thousands of drivers already on the road.'
              )}
            </p>
          </div>
          <Link
            href="/go"
            className="shrink-0 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100"
          >
            {tr('Apply to Drive')} →
          </Link>
        </div>
      </section>

      {/* ─── Coming Soon Banner ─── */}
      <section className="border-t border-yellow-500/20 bg-yellow-500/5">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-6 py-10 text-center">
          <span className="text-3xl">🚧</span>
          <div>
            <h3 className="text-lg font-semibold text-yellow-300">{tr('Coming Soon')}</h3>
            <p className="mt-1 text-sm text-yellow-200/70">
              {tr('BRANDY GO is currently under development. Stay tuned for launch!')}
            </p>
          </div>
          <span className="text-3xl">🚧</span>
        </div>
      </section>

      {/* ─── Footer sliver ─── */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} BRANDY GO —{' '}
        <Link href="/" className="underline hover:text-gray-300">
          {tr('Back to BRANDY')}
        </Link>
      </footer>
    </main>
  );
}
