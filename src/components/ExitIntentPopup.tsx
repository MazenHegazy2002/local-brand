'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Check, Copy } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageContext';

export default function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { lang } = useLanguage();
  const isRtl = lang === 'ar';

  useEffect(() => {
    // Check local storage so we do not prompt repeatedly.
    const hasSeen = localStorage.getItem('brandy-exit-intent-seen');
    if (hasSeen === 'true') return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse moves out of top viewport boundary
      if (e.clientY < 20) {
        setIsOpen(true);
        // Mark as seen immediately so it doesn't trigger again in the same session/visit
        localStorage.setItem('brandy-exit-intent-seen', 'true');
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // In a real application, you'd send this to an API or email newsletter tool like Resend.
    setSubmitted(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText('WELCOME10');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 text-gray-900 animate-in zoom-in-95 duration-300"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header/Close */}
        <button
          onClick={() => setIsOpen(false)}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100`}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-8 text-center text-white relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          <h3 className="text-2xl font-black tracking-tight mb-2">
            {isRtl ? 'انتظر! لا ترحل فارغ اليدين' : "Wait! Don't Go Empty-Handed"}
          </h3>
          <p className="text-blue-100 text-sm font-medium">
            {isRtl
              ? 'احصل على خصم 10% على طلبك الأول اليوم!'
              : 'Get 10% off your first order today!'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed text-center">
                {isRtl
                  ? 'اشترك في نشرتنا البريدية لتصلك أحدث العروض والمنتجات الحصرية من أفضل الماركات المصرية المحلية.'
                  : 'Subscribe to our newsletter to receive the latest deals and exclusive products from top local Egyptian brands.'}
              </p>

              <div className="relative">
                <div
                  className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-gray-400`}
                >
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  placeholder={isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 text-sm font-bold text-white bg-blue-900 rounded-xl hover:bg-blue-800 transition-colors shadow-md shadow-blue-900/10"
              >
                {isRtl ? 'احصل على الخصم الآن' : 'Claim My 10% Discount'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                <Check size={24} />
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-lg text-gray-900">
                  {isRtl ? 'تم تفعيل كود الخصم بنجاح!' : 'Your Discount Code is Active!'}
                </h4>
                <p className="text-gray-600 text-sm">
                  {isRtl
                    ? 'استخدم هذا الكود عند الدفع للحصول على خصم 10%:'
                    : 'Use this code at checkout to save 10% on your purchase:'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl max-w-xs mx-auto">
                <code className="font-mono font-bold text-lg text-blue-900 tracking-wider">
                  WELCOME10
                </code>
                <button
                  onClick={handleCopyCode}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={12} /> {isRtl ? 'تم النسخ' : 'Copied'}
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> {isRtl ? 'نسخ' : 'Copy'}
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xs font-medium underline block mx-auto pt-2"
              >
                {isRtl ? 'إغلاق ومتابعة التسوق' : 'Close and continue shopping'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
