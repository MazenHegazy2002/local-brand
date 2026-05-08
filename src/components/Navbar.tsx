'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  User, 
  ShoppingCart, 
  LayoutDashboard, 
  LogOut
} from 'lucide-react';
import CartDrawer from './CartDrawer';
import NotificationBell from './NotificationBell';
import LiveSearch from './LiveSearch';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '@/providers/LanguageContext';
import { useCartStore } from '@/lib/cartStore';
import CategoriesBar from './CategoriesBar';
import { SessionUser } from '@/types';

export default function Navbar() {
  const { data: session } = useSession();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const router = useRouter();
  const cartCount = useCartStore((s) => s.count());
  const { t } = useLanguage();

  const role = (session?.user as SessionUser)?.role;
  const dashboardHref = role === 'SELLER' ? '/seller-hub' : role === 'ADMIN' ? '/admin-os' : '/dashboard';


  return (
    <>
      <nav className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--background))] sticky top-0 z-50 shadow-lg border-b border-primary-light/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="text-xl font-black tracking-tight shrink-0 text-white">
            {t("Marketplace")}
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-[480px] mx-4">
            <LiveSearch />
          </div>

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
              <Heart size={20} />
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
                    <LayoutDashboard size={14} /> {t("Dashboard")}
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={14} /> {t("SignOut")}
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white transition-colors">
                <User size={20} />
                <span className="hidden sm:inline">{t("SignIn")}</span>
              </Link>
            )}

            {/* Cart */}
            <button onClick={() => setIsCartOpen(true)} className="relative text-white/85 hover:text-white transition-colors">
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
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
