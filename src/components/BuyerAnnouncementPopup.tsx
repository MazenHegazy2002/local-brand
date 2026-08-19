'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { X, Info, AlertTriangle, AlertCircle, Megaphone, Check } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageContext';

export interface PopupAnnouncementData {
  enabled: boolean;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  type?: 'info' | 'warning' | 'danger' | 'success' | string;
  target?: 'all' | 'dashboard' | 'logged_in' | string;
  popupId: string;
}

interface BuyerAnnouncementPopupProps {
  /** If provided, forces display in live preview mode inside admin panel */
  previewData?: PopupAnnouncementData | null;
  onPreviewClose?: () => void;
}

/** Suppress popup on non-buyer routes */
const SUPPRESSED_PREFIXES = ['/admin-os', '/seller-hub'];

export default function BuyerAnnouncementPopup({
  previewData,
  onPreviewClose,
}: BuyerAnnouncementPopupProps) {
  const [data, setData] = useState<PopupAnnouncementData | null>(previewData ?? null);
  const [isOpen, setIsOpen] = useState<boolean>(Boolean(previewData));
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(!previewData);

  const { lang } = useLanguage();
  const isRtl = lang === 'ar';
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();

  const isSuppressed = !previewData && SUPPRESSED_PREFIXES.some(p => pathname.startsWith(p));

  // Sync preview data when passed as prop
  useEffect(() => {
    if (previewData) {
      setData(previewData);
      setIsOpen(true);
      setLoading(false);
    }
  }, [previewData]);

  // Fetch popup announcement data when running live on buyer site
  useEffect(() => {
    if (previewData || isSuppressed) return;
    if (sessionStatus === 'loading') return;

    let isMounted = true;
    const fetchPopup = async () => {
      try {
        const res = await fetch(`/api/announcements/popup?_t=${Date.now()}`);
        if (!res.ok) return;
        const json: PopupAnnouncementData = await res.json();
        if (!isMounted) return;

        if (!json.enabled || !json.message?.trim()) {
          setIsOpen(false);
          return;
        }

        // Check target filter
        if (json.target === 'dashboard' && !pathname.startsWith('/dashboard')) {
          setIsOpen(false);
          return;
        }
        if (json.target === 'logged_in' && !session?.user) {
          setIsOpen(false);
          return;
        }

        // Check local storage for dismissal of this specific popup version ID
        const dismissKey = `buyer_popup_dismissed_${json.popupId || 'v1'}`;
        const hasDismissed = localStorage.getItem(dismissKey);

        if (hasDismissed === 'true') {
          setIsOpen(false);
        } else {
          setData(json);
          setIsOpen(true);
        }
      } catch {
        /* best-effort */
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPopup();

    return () => {
      isMounted = false;
    };
  }, [previewData, isSuppressed, pathname, session, sessionStatus]);

  if (isSuppressed || !isOpen || !data || (!previewData && loading)) return null;

  const activeTitle =
    (isRtl ? data.titleAr || data.title : data.title || data.titleAr) ||
    (isRtl ? 'تنويه هام' : 'Important Notice');

  const activeMessage =
    (isRtl ? data.messageAr || data.message : data.message || data.messageAr) || '';

  const handleClose = () => {
    if (previewData) {
      setIsOpen(false);
      if (onPreviewClose) onPreviewClose();
      return;
    }

    if (dontShowAgain && data.popupId) {
      const dismissKey = `buyer_popup_dismissed_${data.popupId}`;
      try {
        localStorage.setItem(dismissKey, 'true');
      } catch {
        /* storage full or private browsing */
      }
    }
    setIsOpen(false);
  };

  // Theme styling based on type
  const type = data.type || 'info';
  const getThemeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bannerBg: 'bg-gradient-to-r from-amber-600 to-amber-700',
          iconBg: 'bg-amber-500/30 text-amber-100',
          btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
          badgeText: isRtl ? 'تنبيه' : 'Warning',
          Icon: AlertTriangle,
        };
      case 'danger':
        return {
          bannerBg: 'bg-gradient-to-r from-red-600 to-rose-700',
          iconBg: 'bg-red-500/30 text-red-100',
          btnBg: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
          badgeText: isRtl ? 'تنبيه عاجل' : 'Urgent Alert',
          Icon: AlertCircle,
        };
      case 'success':
        return {
          bannerBg: 'bg-gradient-to-r from-emerald-600 to-teal-700',
          iconBg: 'bg-emerald-500/30 text-emerald-100',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
          badgeText: isRtl ? 'خبر سار' : 'Special News',
          Icon: Megaphone,
        };
      case 'info':
      default:
        return {
          bannerBg: 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900',
          iconBg: 'bg-blue-500/30 text-blue-100',
          btnBg: 'bg-blue-900 hover:bg-blue-800 shadow-blue-900/20',
          badgeText: isRtl ? 'تنويه' : 'Announcement',
          Icon: Info,
        };
    }
  };

  const theme = getThemeStyles();
  const IconComponent = theme.Icon;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-gray-100 animate-in zoom-in-95 duration-300"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header / Banner */}
        <div className={`${theme.bannerBg} px-6 py-6 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-10 text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10`}
            aria-label="Close message"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 relative z-10">
            <div className={`p-2.5 rounded-xl ${theme.iconBg} backdrop-blur-md shrink-0`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 mb-1 text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white rounded-full">
                {theme.badgeText}
              </span>
              <h3 className="text-xl font-bold tracking-tight leading-tight">{activeTitle}</h3>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="p-6 space-y-5">
          <div className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-line font-normal max-h-[60vh] overflow-y-auto pr-1">
            {activeMessage}
          </div>

          {/* Dismiss option & Action button */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {!previewData ? (
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none self-start sm:self-center">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={e => setDontShowAgain(e.target.checked)}
                  className="rounded border-gray-300 text-blue-900 focus:ring-blue-900"
                />
                <span>
                  {isRtl ? 'عدم إظهار هذه الرسالة مجدداً' : "Don't show this message again"}
                </span>
              </label>
            ) : (
              <span className="text-xs text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">
                {isRtl ? 'معاينة مباشرة (في لوحة التحكم)' : 'Live Admin Preview'}
              </span>
            )}

            <button
              onClick={handleClose}
              className={`w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-md ${theme.btnBg} flex items-center justify-center gap-2`}
            >
              <Check className="w-4 h-4" />
              <span>{isRtl ? 'حسناً، فهمت' : 'Got it, thanks'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
