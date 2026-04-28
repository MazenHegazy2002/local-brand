'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageContext';
import { useState } from 'react';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems = [
    { href: '/', icon: <HomeIcon />, label: t('Home' as any) || 'Home' },
    { href: '/shop', icon: <CategoryIcon />, label: t('Categories' as any) || 'Categories' },
    { href: '/shop?local=true', icon: <LocalIcon />, label: t('Local' as any) || 'Local' },
    { href: '#', icon: <ProfileIcon />, label: t('Profile' as any) || 'Profile', hasSubmenu: true },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-between items-center px-6 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      {navItems.map((item) => {
        const isActive = item.href !== '#' && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
        return (
          <div key={item.href} className="relative">
            {item.hasSubmenu ? (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`flex flex-col items-center gap-1 ${showProfileMenu ? 'text-[#1e3b8a]' : 'text-gray-500 hover:text-gray-900'} transition-colors`}
              >
                <div className={`p-1 rounded-full ${isActive || showProfileMenu ? 'bg-blue-50' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </button>
            ) : (
              <Link 
                href={item.href}
                className={`flex flex-col items-center gap-1 ${isActive ? 'text-[#1e3b8a]' : 'text-gray-500 hover:text-gray-900'} transition-colors`}
              >
                <div className={`p-1 rounded-full ${isActive ? 'bg-blue-50' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </Link>
            )}
            
            {/* Profile Submenu */}
            {item.hasSubmenu && showProfileMenu && (
              <div className="absolute bottom-16 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[160px]">
                {[
                  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
                  { href: '/dashboard?tab=wishlist', label: 'Wishlist', icon: '❤️' },
                  { href: '/dashboard?tab=discover', label: 'Discover', icon: '🔍' },
                  { href: '/dashboard?tab=points', label: 'Points', icon: '⭐' },
                ].map((subItem, i) => (
                  <Link
                    key={i}
                    href={subItem.href}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="text-base">{subItem.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{subItem.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HomeIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function CategoryIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function LocalIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>; }
function ProfileIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
