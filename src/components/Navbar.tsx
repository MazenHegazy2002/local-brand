'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Heart, User, ShoppingCart, LayoutDashboard, LogOut, Store } from 'lucide-react';
import CartDrawer from './CartDrawer';
import NotificationBell from './NotificationBell';
import LiveSearch from './LiveSearch';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '@/providers/LanguageContext';
import { useCartStore } from '@/lib/cartStore';
import CategoriesBar from './CategoriesBar';
import { SessionUser } from '@/types';
import { useRouter } from 'next/navigation';
import DropdownMenu from './ui/DropdownMenu';
import { useWishlistStore } from '@/lib/wishlistStore';

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [categories, setCategories] = useState<any[]>([]);
  const syncLocalItems = useWishlistStore(s => s.syncLocalItems);

  useEffect(() => {
    if (session) {
      syncLocalItems();
    }
  }, [session, syncLocalItems]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Navbar error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);
  const [mounted, setMounted] = useState(false);
  const wishlistCount = useWishlistStore(s => s.items.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cartCount = useCartStore(s => s.count());
  const clearCart = useCartStore(s => s.clearCart);
  const { t } = useLanguage();

  const role = (session?.user as SessionUser)?.role;
  const dashboardHref =
    role === 'SELLER' ? '/seller-hub' : role === 'ADMIN' ? '/admin-os' : '/dashboard';

  // Close the user menu on outside click and on Escape so it works
  // identically on desktop and on mobile / touch devices.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [isUserMenuOpen]);

  return (
    <>
      {/* Upper fixed banner for Affiliate Program */}
      {mounted && (
        <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white py-2 px-4 text-center text-xs font-black tracking-wide shadow-sm flex items-center justify-center gap-1.5 uppercase transition-all duration-300 hover:brightness-105">
          <span>📢 Earn up to 10% cash on every purchase!</span>
          <Link
            href="/affiliate"
            className="underline hover:text-amber-100 transition-colors inline-flex items-center gap-0.5"
          >
            Join Affiliate Program
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      )}

      <header className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--background))] sticky top-0 z-50 shadow-lg border-b border-primary-light/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="text-xl font-black tracking-tight shrink-0 text-white">
            {t('Marketplace')}
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-[480px] mx-4">
            <LiveSearch />
          </div>

          {/* Nav links */}
          <div className="hidden xl:flex items-center gap-5 text-sm font-semibold text-white/85">
            <DropdownMenu
              align="left"
              trigger={
                <button
                  type="button"
                  className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer outline-none"
                >
                  {t('Categories')}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="mt-0.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              }
              items={(categories.length > 0
                ? categories
                : [
                    { name: 'Women', slug: 'women' },
                    { name: 'Men', slug: 'men' },
                    { name: 'Kids', slug: 'kids' },
                    { name: 'Accessories', slug: 'accessories' },
                    { name: 'Electronics', slug: 'electronics' },
                    { name: 'Home Decor', slug: 'home-decor' },
                  ]
              ).map((cat: any) => ({
                id: cat.slug || cat.id,
                label: t(cat.name as any) || cat.name,
                onClick: () => router.push(`/category/${cat.slug}`),
              }))}
            />
            <Link
              href="/flash-sales"
              className="hover:text-white transition-colors border-b-2 border-white pb-0.5 text-white"
            >
              {t('FlashSales')}
            </Link>
            <Link href="/brands" className="hover:text-white transition-colors">
              {t('TopBrands')}
            </Link>
            <Link href="/track" className="hover:text-white transition-colors">
              {t('TrackOrder')}
            </Link>
            <Link href="/help" className="hover:text-white transition-colors">
              {t('Help')}
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 shrink-0">
            <LanguageToggle />

            <Link
              href={
                session
                  ? `${dashboardHref === '/dashboard' ? '/dashboard?tab=wishlist' : dashboardHref}`
                  : '/login?callbackUrl=%2Fdashboard%3Ftab%3Dwishlist'
              }
              className="hidden sm:flex flex-col items-center text-white/80 hover:text-white transition-colors relative"
              aria-label="Wishlist"
            >
              <Heart size={20} />
              {mounted && wishlistCount > 0 && (
                <span className="text-[10px] leading-none font-bold mt-1 bg-red-500 text-white rounded-full min-w-[14px] px-1 py-0.5 text-center shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Notification Bell */}
            <div className="text-white [&_button]:text-white/85 [&_button:hover]:text-white">
              <NotificationBell />
            </div>

            {/* Start Selling CTA — shown to guests and buyers only */}
            {(!session || role === 'BUYER') && (
              <Link
                href="/seller/apply"
                className="hidden lg:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:opacity-90 transition-opacity shrink-0"
              >
                <Store size={13} />
                Start Selling
              </Link>
            )}

            {/* User menu — click-based so it works on touch devices */}
            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(v => !v)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  aria-label="Open account menu"
                  className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
                >
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))] flex items-center justify-center font-black text-xs">
                    {(session.user?.name ?? 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="hidden lg:block text-xs font-semibold text-white/90">
                    My Account
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute top-11 right-0 w-56 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100 text-gray-900"
                    role="menu"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <span className="text-sm font-bold block truncate">{session.user?.name}</span>
                      <span className="text-xs text-gray-500 capitalize">
                        {role?.toLowerCase() ?? 'buyer'}
                      </span>
                    </div>
                    <Link
                      href={dashboardHref}
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <LayoutDashboard size={14} /> {t('Dashboard')}
                    </Link>
                    {role === 'BUYER' && (
                      <Link
                        href="/dashboard?tab=wishlist"
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Heart size={14} /> {t('Wishlist')}
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        clearCart();
                        signOut({ callbackUrl: '/' });
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} /> {t('SignOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white transition-colors"
              >
                <User size={20} />
                <span className="hidden sm:inline">{t('SignIn')}</span>
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Open cart"
              className="relative text-white/85 hover:text-white transition-colors"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[hsl(var(--accent))] text-[hsl(var(--primary))] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3">
          <LiveSearch />
        </div>

        <CategoriesBar />
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
