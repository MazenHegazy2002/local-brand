'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CartDrawer from './CartDrawer';
import NotificationBell from './NotificationBell';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '@/providers/LanguageContext';
import { useCartStore } from '@/lib/cartStore';

export default function Navbar() {
  const { data: session } = useSession();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const cartCount = useCartStore((s) => s.count());
  const { t } = useLanguage();

  const role = (session?.user as any)?.role;
  const dashboardHref = role === 'SELLER' ? '/seller-hub' : role === 'ADMIN' ? '/admin-os' : '/dashboard';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/shop?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <>
      <nav className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--background))] sticky top-0 z-50 shadow-lg border-b border-primary-light/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="text-xl font-black tracking-tight shrink-0 text-white">
            {t("Marketplace")}
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-[480px] mx-4 relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("SearchPlaceholder")}
              className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-lg py-2 px-4 pr-10 outline-none text-sm focus:bg-white/15 transition-colors"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
              <SearchIcon />
            </button>
          </form>

          {/* Nav links */}
          <div className="hidden xl:flex items-center gap-5 text-sm font-semibold text-white/85">
            <Link href="/flash-sales" className="hover:text-white transition-colors border-b-2 border-white pb-0.5 text-white">{t("FlashSales")}</Link>
            <Link href="/brands" className="hover:text-white transition-colors">{t("TopBrands")}</Link>
            <Link href="/help" className="hover:text-white transition-colors">{t("Help")}</Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 shrink-0">
            
            <LanguageToggle />
            
            {/* Wishlist */}
            <Link href="/dashboard" className="hidden sm:block text-white/80 hover:text-white transition-colors">
              <HeartIcon />
            </Link>

            {/* Notification Bell */}
            <div className="text-white [&_button]:text-white/85 [&_button:hover]:text-white">
              <NotificationBell />
            </div>

            {/* User menu */}
            {session ? (
              <div className="relative group cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))] flex items-center justify-center font-black text-xs">
                    {(session.user?.name ?? 'U').slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="absolute top-10 right-0 w-52 bg-white rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden border border-gray-100 text-gray-900">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <span className="text-sm font-bold block">{session.user?.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{role?.toLowerCase() ?? 'buyer'}</span>
                  </div>
                  <Link href={dashboardHref} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                    <DashboardIcon /> {t("Dashboard")}
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    <LogoutIcon /> {t("SignOut")}
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white transition-colors">
                <UserIcon />
                <span className="hidden sm:inline">{t("SignIn")}</span>
              </Link>
            )}

            {/* Cart */}
            <button onClick={() => setIsCartOpen(true)} className="relative text-white/85 hover:text-white transition-colors">
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[hsl(var(--accent))] text-[hsl(var(--primary))] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("SearchPlaceholder")}
              className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-lg py-2 px-4 pr-10 outline-none text-sm"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
              <SearchIcon />
            </button>
          </div>
        </form>
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function HeartIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function UserIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function CartIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>; }
function DashboardIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function LogoutIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
