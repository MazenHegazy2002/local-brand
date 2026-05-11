'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { DictKey } from '@/lib/i18n/dicts';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWishlistCount = async () => {
      if (!session) return;
      try {
        const res = await fetch('/api/wishlist/count');
        if (res.ok) {
          const data = await res.json();
          setWishlistCount(data.count || 0);
        }
      } catch (e) { console.error(e); }
    };
    fetchWishlistCount();
  }, [session]);

  // Close the profile popover when clicking outside or pressing Escape.
  useEffect(() => {
    if (!showProfileMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [showProfileMenu]);

  // Close the menu whenever the route changes. We compare against a ref so
  // the effect only runs *because of* a navigation, not because of any other
  // re-render — which keeps React's "no setState in an effect body" rule happy.
  const lastPathnameRef = useRef(pathname);
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      setShowProfileMenu(false);
    }
  }, [pathname]);

  type NavItem = {
    href: string;
    icon: React.ReactNode;
    label: string;
    hasSubmenu?: boolean;
  };

  const navItems: NavItem[] = [
    { href: '/', icon: <HomeIcon />, label: t('Home' as DictKey) || 'Home' },
    { href: '/categories', icon: <CategoryIcon />, label: t('Categories' as DictKey) || 'Categories' },
    { href: '/shop?local=true', icon: <LocalIcon />, label: t('Local' as DictKey) || 'Local' },
    { href: '#profile', icon: <ProfileIcon />, label: t('Profile' as DictKey) || 'Profile', hasSubmenu: true },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  // Profile submenu items — Discover removed; Dashboard, Wishlist, Points only.
  // For unauthenticated users we point to /login instead.
  const profileItems = session
    ? [
        { href: '/dashboard',                  label: t('Dashboard' as DictKey) || 'Dashboard',  icon: '📊' },
        { href: '/dashboard?tab=wishlist',     label: t('Wishlist'  as DictKey) || 'Wishlist',   icon: '❤️' },
        { href: '/dashboard?tab=wallet',       label: t('Points'    as DictKey) || 'Points',     icon: '⭐' },
      ]
    : [
        { href: '/login', label: t('SignIn' as DictKey) || 'Sign in', icon: '🔑' },
        { href: '/register', label: t('Register' as DictKey) || 'Register', icon: '📝' },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around items-center px-2 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe"
      aria-label="Bottom navigation"
    >
      {navItems.map((item) => {
        const isActive =
          item.href !== '#profile' &&
          (pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href.split('?')[0])));

        return (
          <div key={item.href} className="relative" ref={item.hasSubmenu ? profileRef : undefined}>
            {item.hasSubmenu ? (
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                onKeyDown={(e) => handleKeyDown(e, () => setShowProfileMenu((v) => !v))}
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
                className={`flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center ${
                  showProfileMenu ? 'text-[hsl(var(--primary))]' : 'text-gray-500 hover:text-gray-900'
                } transition-colors`}
              >
                <div className={`p-1 rounded-full ${showProfileMenu ? 'bg-[hsl(var(--primary)/0.08)]' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </button>
            ) : (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center ${
                  isActive ? 'text-[hsl(var(--primary))]' : 'text-gray-500 hover:text-gray-900'
                } transition-colors`}
              >
                <div className={`p-1 rounded-full ${isActive ? 'bg-[hsl(var(--primary)/0.08)]' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </Link>
            )}

            {item.hasSubmenu && showProfileMenu && (
              <div
                className="absolute bottom-16 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[180px]"
                role="menu"
              >
                {profileItems.map((subItem, i) => (
                  <Link
                    key={i}
                    href={subItem.href}
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[hsl(var(--primary)/0.05)] transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="text-base">{subItem.icon}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {subItem.label}
                      {subItem.label === 'Wishlist' && wishlistCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {wishlistCount > 9 ? '9+' : wishlistCount}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function HomeIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function CategoryIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function LocalIcon()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>; }
function ProfileIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
