'use client';

import { useState, useEffect, Suspense } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createOrder } from '@/app/actions/orders';
import Navbar from '@/components/Navbar';
import PaySkyCheckout from '@/components/PaySkyCheckout';
import { SessionUser } from '@/types';
import { VAT_RATE } from '@/lib/constants';
import { GOVERNORATES } from '@/lib/governorates';
import { useLanguage } from '@/providers/LanguageContext';

interface PaySkyInitData {
  lightboxUrl: string;
  lightboxConfig: {
    MID: string;
    TID: string;
    AmountTrxn: string;
    MerchantReference: string;
    TrxDateTime: string;
    SecureHash: string;
  };
}

interface SavedAddress {
  id: string;
  street: string;
  city: string;
  governorate: string;
  postalCode?: string | null;
  isDefault?: boolean;
}

function CheckoutPageInner() {
  const { items, total, clearCart, removeItem, rewriteId } = useCartStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { lang, isRTL, t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartNotice, setCartNotice] = useState('');

  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    governorate: '',
  });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('');

  // Guest checkout email — required when the user isn't signed in so we can
  // send the order confirmation and surface a contact in admin/seller views.
  const [guestEmail, setGuestEmail] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<
    'CASH_ON_DELIVERY' | 'CREDIT_CARD' | 'MOBILE_WALLET' | 'PAYSKY'
  >('CASH_ON_DELIVERY');

  // PaySky session state — populated after we hit /api/payment/paysky
  const [paySkyInit, setPaySkyInit] = useState<PaySkyInitData | null>(null);
  const [paySkyMockMessage, setPaySkyMockMessage] = useState<string>('');

  // Coupon state — pre-fill code from ?promo= URL param (set by CartDrawer)
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<{
    id: string;
    code?: string;
    amount: number;
    isAffiliate?: boolean; // true when it's an affiliate promo code, not a coupon
    affiliateCode?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Loyalty points state
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsError, setPointsError] = useState('');

  // Additional checkout options
  const [orderNotes, setOrderNotes] = useState('');
  const [giftWrapping, setGiftWrapping] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);

  // Pre-fill promo code from ?promo= URL param (passed by CartDrawer) and auto-apply
  useEffect(() => {
    const promoParam = searchParams.get('promo');
    if (!promoParam || couponApplied) return;
    const code = promoParam.toUpperCase();
    setCouponCode(code);
    // Auto-apply after a short delay to let the cart finish loading
    const t = setTimeout(async () => {
      const subtotal = total();
      if (subtotal === 0) return;
      try {
        const res = await fetch('/api/coupons/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, cartTotal: subtotal }),
        });
        const data: { discountAmount?: number; couponId?: string; message?: string } =
          await res.json();
        if (res.ok && data.discountAmount) {
          setCouponApplied({ id: data.couponId ?? code, code, amount: data.discountAmount });
          setCouponCode('');
          return;
        }
        const affRes = await fetch('/api/checkout/apply-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, orderTotalEgp: subtotal }),
        });
        const affData: { valid: boolean; discountAmountEgp?: number } = await affRes.json();
        if (affData.valid && affData.discountAmountEgp) {
          setCouponApplied({
            id: `aff_${code}`,
            code,
            amount: affData.discountAmountEgp,
            isAffiliate: true,
            affiliateCode: code,
          });
          setCouponCode('');
        }
      } catch {
        // Silent — user can always apply manually
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch user loyalty points and saved address
  useEffect(() => {
    if (session?.user) {
      // Loyalty points
      fetch('/api/loyalty')
        .then(res => res.json())
        .then((data: { points?: number }) => {
          if (data.points !== undefined) {
            setLoyaltyPoints(data.points);
          }
        })
        .catch((error: unknown) => console.error(error));

      // Saved address
      fetch('/api/addresses')
        .then(res => res.json())
        .then((data: { addresses?: SavedAddress[] }) => {
          if (data.addresses && data.addresses.length > 0) {
            const defaultAddr = data.addresses[0]; // ordered by isDefault desc
            setSavedAddresses(data.addresses);
            setSelectedSavedAddressId(defaultAddr.id);
            setAddress({
              fullName: session.user?.name || '',
              // @ts-expect-error - session.user type might not expose phone directly in NextAuth types
              phone: session.user?.phone || '',
              address: defaultAddr.street || '',
              city: defaultAddr.city || '',
              governorate: defaultAddr.governorate || '',
            });
          } else {
            // Just pre-fill name/phone if no address
            setAddress(prev => ({
              ...prev,
              fullName: session.user?.name || '',
              // @ts-expect-error - session.user type might not expose phone directly in NextAuth types
              phone: session.user?.phone || prev.phone,
            }));
          }
        })
        .catch((error: unknown) => console.error(error));
    }
  }, [session]);

  // Reconcile the cart against the database:
  //   1. Rewrite legacy Product-id entries to their default Variant id so
  //      the order can actually ship.
  //   2. Drop entries whose variant has been deleted (e.g. after a
  //      re-seed), and tell the user which items went away.
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantIds: items.map(i => i.variantId || i.id) }),
        });
        if (!res.ok) return;
        const data: { invalid?: string[]; rewrites?: Record<string, string> } = await res.json();
        if (cancelled) return;
        if (data.rewrites) {
          for (const [oldId, newId] of Object.entries(data.rewrites)) {
            const sourceItem = items.find(i => i.id === oldId || i.variantId === oldId);
            if (sourceItem) {
              rewriteId(sourceItem.id, newId);
            }
          }
        }
        if (!data.invalid?.length) return;
        const removedNames: string[] = [];
        for (const invalidVariantId of data.invalid) {
          const matchedItems = items.filter(i => (i.variantId || i.id) === invalidVariantId);
          for (const mi of matchedItems) {
            removedNames.push(mi.name);
            removeItem(mi.id);
          }
        }
        if (removedNames.length) {
          setCartNotice(
            `Removed ${removedNames.length} item${removedNames.length === 1 ? '' : 's'} that ${
              removedNames.length === 1 ? 'is' : 'are'
            } no longer available: ${removedNames.join(', ')}`
          );
        }
      } catch (err) {
        console.warn('Cart validation failed (non-fatal):', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We deliberately only run when the items length changes — running on
    // every items reference change would loop after each removal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Calculations
  const subtotal = total();
  const couponDiscount = couponApplied?.amount || 0;
  const pointsDiscount = pointsToUse;
  const afterDiscount = subtotal - couponDiscount - pointsDiscount;
  const shipping = 50;
  const giftWrapFee = giftWrapping ? 25 : 0;
  const vatRate = VAT_RATE;
  const vatAmount = Math.max(0, afterDiscount * vatRate);
  const grandTotal = Math.max(0, afterDiscount + shipping + vatAmount + giftWrapFee);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');

    try {
      // First try as a store coupon
      const res = await fetch('/api/coupons/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, cartTotal: subtotal - pointsDiscount }),
      });
      const data: { message?: string; couponId: string; discountAmount: number } = await res.json();

      if (res.ok) {
        setCouponApplied({
          id: data.couponId,
          code: couponCode,
          amount: data.discountAmount,
          isAffiliate: false,
        });
        return;
      }

      // If coupon not found, try as an affiliate promo code
      const affRes = await fetch('/api/checkout/apply-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderTotalEgp: subtotal - pointsDiscount }),
      });
      const affData: { valid: boolean; reason?: string; discountAmountEgp?: number } =
        await affRes.json();

      if (affData.valid && affData.discountAmountEgp) {
        setCouponApplied({
          id: `aff_${couponCode}`,
          code: couponCode,
          amount: affData.discountAmountEgp,
          isAffiliate: true,
          affiliateCode: couponCode,
        });
        return;
      }

      setCouponError(affData.reason || data.message || 'Invalid promo code');
    } catch (err: unknown) {
      setCouponError('Failed to apply promo code');
      console.error(err);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
  };

  const handlePointsChange = (value: number) => {
    const points = Math.max(0, Math.min(value, loyaltyPoints, subtotal - couponDiscount));
    setPointsToUse(points);
    setPointsError('');
  };

  const selectSavedAddress = (id: string) => {
    setSelectedSavedAddressId(id);
    const savedAddress = savedAddresses.find(addr => addr.id === id);
    if (!savedAddress) return;
    setAddress(prev => ({
      ...prev,
      address: savedAddress.street || '',
      city: savedAddress.city || '',
      governorate: savedAddress.governorate || '',
    }));
  };

  if (items.length === 0 && !isLoading) {
    return (
      <main className="min-h-screen bg-[#f9f8f6]" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center text-gray-500">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('EmptyCart')}</h1>
          <p className="mb-6">
            {lang === 'ar'
              ? 'يجب عليك إضافة منتجات إلى سلتك قبل المتابعة.'
              : 'You need to add products to your cart before proceeding.'}
          </p>
          <button
            onClick={() => router.push('/shop')}
            className="bg-[#1e3b8a] text-white font-bold py-3 px-8 rounded-lg"
          >
            {lang === 'ar' ? 'العودة للمتجر' : 'Return to Shop'}
          </button>
        </div>
      </main>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Basic client-side validation
    if (
      !address.fullName.trim() ||
      !address.phone.trim() ||
      !address.address.trim() ||
      !address.city.trim() ||
      !address.governorate
    ) {
      setError(
        lang === 'ar'
          ? 'يرجى ملء جميع حقول عنوان الشحن.'
          : 'Please fill in all shipping address fields.'
      );
      return;
    }

    // Guest checkout requires a contact email for the confirmation receipt.
    const trimmedGuestEmail = guestEmail.trim();
    if (!session?.user) {
      if (!trimmedGuestEmail) {
        setError(
          lang === 'ar'
            ? 'يرجى إدخال عنوان بريدك الإلكتروني حتى نتمكن من إرسال تأكيد طلبك.'
            : 'Please enter your email address so we can send your order confirmation.'
        );
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedGuestEmail)) {
        setError(
          lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.'
        );
        return;
      }
      if (paymentMethod === 'PAYSKY') {
        setError(
          lang === 'ar'
            ? 'يتطلب الدفع عبر PaySky حساباً على براندي. يرجى تسجيل الدخول أو اختيار الدفع عند الاستلام / المحفظة الإلكترونية.'
            : 'PaySky checkout requires a Brandy account. Please sign in or choose Cash on Delivery / Mobile Wallet.'
        );
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setPaySkyMockMessage('');

    try {
      // ── 1. Persist the address (so orders are linked to a real Address row) ──
      let addressId: string | undefined;
      if (session?.user) {
        try {
          const addrRes = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: address.fullName,
              phone: address.phone,
              street: address.address,
              city: address.city,
              governorate: address.governorate,
              isDefault: true,
            }),
          });
          if (addrRes.ok) {
            const addrJson = await addrRes.json();
            addressId = addrJson?.id || addrJson?.address?.id;
          }
        } catch (err) {
          console.warn('Address save failed, continuing without addressId:', err);
        }
      }

      // ── PaySky branch — skip createOrder for now, finalize on callback ──
      if (paymentMethod === 'PAYSKY') {
        const res = await fetch('/api/payment/paysky', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartItems: items.map(item => ({ id: item.id, qty: item.qty })),
            addressInfo: {
              fullName: address.fullName,
              phone: address.phone,
              street: address.address,
              city: address.city,
              governorate: address.governorate,
            },
            couponId: couponApplied?.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to initiate PaySky payment');

        if (data.mockMode) {
          setPaySkyMockMessage(
            data.message ||
              'PaySky env vars are not set on the server. Configure PAYSKY_MERCHANT_ID, PAYSKY_TERMINAL_ID, and PAYSKY_MERCHANT_SECRET to enable real payments.'
          );
          setIsLoading(false);
          return;
        }

        setPaySkyInit({
          lightboxUrl: data.lightboxUrl,
          lightboxConfig: data.lightboxConfig,
        });
        return;
      }

      // ── 2. Deduct loyalty points if used ─────────────────────────────────────
      if (pointsToUse > 0 && session?.user) {
        try {
          const { redeemLoyaltyPoints } = await import('@/app/actions/loyalty');
          const userId = (session.user as SessionUser).id;
          await redeemLoyaltyPoints(userId, pointsToUse);
        } catch (err: unknown) {
          const error = err as Error;
          setError(
            error.message || (lang === 'ar' ? 'فشل استبدال النقاط' : 'Failed to redeem points')
          );
          setIsLoading(false);
          return;
        }
      }

      // ── 3. Create the order ──────────────────────────────────────────────────
      const res = await createOrder({
        items: items.map(item => ({
          variantId: item.variantId || item.id,
          quantity: item.qty,
          selectedSize: item.selectedSize || undefined,
          selectedColor: item.selectedColor || undefined,
        })),
        addressId,
        // Always send the inline shipping address as a fallback in case the
        // address row couldn't be persisted (e.g. for guest checkout).
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          street: address.address,
          city: address.city,
          governorate: address.governorate,
        },
        // Only attach guestEmail for guests — the server stores it on
        // Order.guestEmail and uses it to send the confirmation receipt.
        guestEmail: session?.user ? undefined : trimmedGuestEmail,
        paymentMethod,
        // Pass coupon code only for store coupons; affiliate promo codes go in promoCode
        couponCode:
          couponApplied && !couponApplied.isAffiliate ? couponApplied.code || undefined : undefined,
        promoCode: couponApplied?.isAffiliate ? couponApplied.affiliateCode : undefined,
        orderNotes: orderNotes.trim() || undefined,
        giftWrapping,
        pointsRedeemed: pointsToUse || undefined,
      });

      if (res.success && res.orderId) {
        clearCart();
        setCouponApplied(null);
        setPointsToUse(0);
        router.push(`/checkout/success?orderId=${res.orderId}`);
        return;
      }

      // ── 4. Order action returned a structured error — surface it & stop ──────
      const message = res.error || (lang === 'ar' ? 'فشل تقديم الطلب' : 'Failed to place order');
      // Refund any redeemed points so the user isn't charged for a failed order.
      if (pointsToUse > 0 && session?.user) {
        try {
          const { refundLoyaltyPoints } = await import('@/app/actions/loyalty');
          const userId = (session.user as SessionUser).id;
          await refundLoyaltyPoints(userId, pointsToUse);
        } catch (err) {
          console.error('Failed to refund redeemed points:', err);
        }
      }
      setError(message);
      setIsLoading(false);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || (lang === 'ar' ? 'فشل تقديم الطلب' : 'Failed to place order'));
      setIsLoading(false);
    }
  };

  const handlePaySkySuccess = (orderId: string) => {
    clearCart();
    setCouponApplied(null);
    setPointsToUse(0);
    setPaySkyInit(null);
    router.push(`/checkout/success?orderId=${orderId}`);
  };

  const handlePaySkyError = (message: string) => {
    setError(message);
    setPaySkyInit(null);
    setIsLoading(false);
  };

  const handlePaySkyCancel = () => {
    setPaySkyInit(null);
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1
          className="text-3xl font-black text-gray-900 mb-8"
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('Checkout')}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column - Forms */}
          <div className="w-full lg:w-2/3 space-y-6">
            {cartNotice && (
              <div
                className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 font-medium flex items-start justify-between gap-3"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                <span>{cartNotice}</span>
                <button
                  type="button"
                  onClick={() => setCartNotice('')}
                  aria-label="Dismiss"
                  className="text-amber-700 hover:text-amber-900"
                >
                  ×
                </button>
              </div>
            )}
            {error && (
              <div
                className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium flex items-start justify-between gap-3"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                <span>{error}</span>
                {(/^Product variant .* not found/i.test(error) ||
                  /no longer available/i.test(error)) && (
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setError('');
                      router.push('/shop');
                    }}
                    className="shrink-0 px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                  >
                    {lang === 'ar' ? 'مسح السلة' : 'Clear cart'}
                  </button>
                )}
              </div>
            )}

            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2
                  className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">
                    1
                  </span>
                  {t('CheckoutShippingAddress')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {session?.user && savedAddresses.length > 0 && (
                    <div className="md:col-span-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {lang === 'ar' ? 'اختر عنواناً محفوظاً' : 'Use a saved address'}
                      </label>
                      <select
                        value={selectedSavedAddressId}
                        onChange={e => selectSavedAddress(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white font-sans"
                        style={{
                          textAlign: isRTL ? 'right' : 'left',
                          direction: isRTL ? 'rtl' : 'ltr',
                        }}
                      >
                        {savedAddresses.map(savedAddress => (
                          <option key={savedAddress.id} value={savedAddress.id}>
                            {[
                              savedAddress.isDefault
                                ? lang === 'ar'
                                  ? 'الافتراضي'
                                  : 'Default'
                                : null,
                              savedAddress.street,
                              savedAddress.city,
                              savedAddress.governorate,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {lang === 'ar'
                          ? 'يمكنك تعديل الحقول أدناه لهذا الطلب فقط.'
                          : 'You can edit the fields below for this order only.'}
                      </p>
                    </div>
                  )}
                  {!session?.user && (
                    <div className="md:col-span-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('CheckoutEmailGuest')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                        placeholder="you@example.com"
                        autoComplete="email"
                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {lang === 'ar'
                          ? 'سنرسل تأكيد طلبك وتحديثات التتبع هنا.'
                          : "We'll send your order confirmation and tracking updates here."}{' '}
                        <a
                          href="/login?callbackUrl=/checkout"
                          className="text-[#1e3b8a] font-medium hover:underline"
                        >
                          {t('CheckoutAlreadyAccount')} {t('SignIn')}
                        </a>
                      </p>
                    </div>
                  )}
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('CheckoutFullName')}
                    </label>
                    <input
                      required
                      type="text"
                      value={address.fullName}
                      onChange={e => setAddress({ ...address, fullName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder={lang === 'ar' ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'}
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                  </div>
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('CheckoutPhone')}
                    </label>
                    <input
                      required
                      type="tel"
                      value={address.phone}
                      onChange={e => setAddress({ ...address, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder={lang === 'ar' ? 'مثال: 01234567890' : 'e.g. 01234567890'}
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                  </div>
                  <div className="md:col-span-2" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('CheckoutStreetAddress')}
                    </label>
                    <input
                      required
                      type="text"
                      value={address.address}
                      onChange={e => setAddress({ ...address, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder={
                        lang === 'ar'
                          ? 'مثال: ١٢ شارع النصر، عمارة ٤'
                          : 'e.g. 12 El Nasr St, Building 4'
                      }
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                  </div>
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('CheckoutCity')}
                    </label>
                    <input
                      required
                      type="text"
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      placeholder={
                        lang === 'ar' ? 'مثال: المعادي، القاهرة الجديدة' : 'e.g. Maadi, New Cairo'
                      }
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                  </div>
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('CheckoutGovernorate')}
                    </label>
                    <select
                      required
                      value={address.governorate}
                      onChange={e => setAddress({ ...address, governorate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white font-sans"
                      style={{
                        textAlign: isRTL ? 'right' : 'left',
                        direction: isRTL ? 'rtl' : 'ltr',
                      }}
                    >
                      <option value="">{t('CheckoutSelectGovernorate')}</option>
                      {GOVERNORATES.map(g => (
                        <option key={g.value} value={g.value}>
                          {lang === 'ar' ? g.ar : g.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Loyalty Points */}
              {session && loyaltyPoints > 0 && (
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h2
                    className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">
                      2
                    </span>
                    {t('CheckoutLoyaltyPoints')}
                  </h2>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-purple-50 border border-purple-200 rounded-lg p-4 gap-4"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <div>
                      <div className="font-bold text-purple-800">
                        {t('CheckoutPointsAvailable').replace(
                          '{points}',
                          loyaltyPoints.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')
                        )}
                      </div>
                      <div className="text-sm text-purple-600">{t('CheckoutPointsRate')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={Math.min(loyaltyPoints, subtotal - couponDiscount)}
                        value={pointsToUse || ''}
                        onChange={e => handlePointsChange(parseInt(e.target.value) || 0)}
                        placeholder={t('CheckoutUsePoints')}
                        className="w-28 border border-purple-300 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-purple-500 outline-none"
                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                      />
                      <span className="text-sm text-purple-600 font-bold">
                        = {pointsToUse.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                      </span>
                    </div>
                  </div>
                  {pointsError && <p className="text-red-500 text-sm mt-2">{pointsError}</p>}
                </div>
              )}

              {/* Promo Code */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2
                  className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">
                    3
                  </span>
                  {t('CheckoutPromoCode')}
                </h2>

                {couponApplied ? (
                  <div
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0 font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-green-800">{t('CheckoutCouponApplied')}</div>
                        <div className="text-sm text-green-600 font-semibold">
                          {t('CheckoutYouSaved').replace(
                            '{amount}',
                            couponDiscount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-green-700 hover:text-green-900 text-sm font-semibold transition-colors"
                    >
                      {t('CheckoutRemove')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={t('CheckoutEnterPromoCode')}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="bg-[#1e3b8a] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#152c6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {applyingCoupon ? t('CheckoutApplying') : t('CheckoutApply')}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
              </div>

              {/* Payment Method */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2
                  className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">
                    4
                  </span>
                  {t('CheckoutPaymentMethod')}
                </h2>

                <div className="space-y-4">
                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="CASH_ON_DELIVERY"
                      checked={paymentMethod === 'CASH_ON_DELIVERY'}
                      onChange={() => {
                        setPaymentMethod('CASH_ON_DELIVERY');
                        setShowInstallments(false);
                      }}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{t('CheckoutCashOnDelivery')}</div>
                      <div className="text-sm text-gray-500">{t('CheckoutCodDesc')}</div>
                    </div>
                    <div className="text-3xl shrink-0">💵</div>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'CREDIT_CARD' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="CREDIT_CARD"
                      checked={paymentMethod === 'CREDIT_CARD'}
                      onChange={() => {
                        setPaymentMethod('CREDIT_CARD');
                        setShowInstallments(false);
                      }}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{t('CheckoutCreditCard')}</div>
                      <div className="text-sm text-gray-500">{t('CheckoutStripeDesc')}</div>
                    </div>
                    <div className="text-3xl shrink-0">💳</div>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'MOBILE_WALLET' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="MOBILE_WALLET"
                      checked={paymentMethod === 'MOBILE_WALLET'}
                      onChange={() => {
                        setPaymentMethod('MOBILE_WALLET');
                        setShowInstallments(false);
                      }}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{t('CheckoutMobileWallet')}</div>
                      <div className="text-sm text-gray-500">{t('CheckoutWalletDesc')}</div>
                    </div>
                    <div className="text-3xl shrink-0">📱</div>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'PAYSKY' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="PAYSKY"
                      checked={paymentMethod === 'PAYSKY'}
                      onChange={() => {
                        setPaymentMethod('PAYSKY');
                        setShowInstallments(false);
                      }}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{t('CheckoutPaySky')}</div>
                      <div className="text-sm text-gray-500">{t('CheckoutPaySkyDesc')}</div>
                    </div>
                    <div className="text-3xl shrink-0">🇪🇬</div>
                  </label>

                  {/* PaySky Lightbox renders here when active */}
                  {paySkyInit && (
                    <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
                      <PaySkyCheckout
                        initData={paySkyInit}
                        onSuccess={handlePaySkySuccess}
                        onError={handlePaySkyError}
                        onCancel={handlePaySkyCancel}
                      />
                    </div>
                  )}

                  {paySkyMockMessage && (
                    <div
                      className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs"
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    >
                      <strong className="font-bold">{t('CheckoutPaySkyMock')}:</strong>{' '}
                      {paySkyMockMessage}
                    </div>
                  )}

                  {/* Express Payment Buttons */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <div
                      className="mt-4 pt-4 border-t border-gray-100"
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    >
                      <p className="text-xs text-gray-500 mb-3">{t('CheckoutOrExpress')}</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>🍎</span> {t('CheckoutApplePay')}
                        </button>
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>🔷</span> {t('CheckoutGooglePay')}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{t('CheckoutExpressRequired')}</p>
                    </div>
                  )}
                </div>

                {/* Installment Option */}
                {paymentMethod === 'CREDIT_CARD' && grandTotal >= 1000 && (
                  <div className="mt-4" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <button
                      type="button"
                      onClick={() => setShowInstallments(!showInstallments)}
                      className="text-sm text-[#1e3b8a] font-medium flex items-center gap-2 hover:underline transition-all"
                    >
                      <span>📊</span>
                      {showInstallments
                        ? t('CheckoutHideInstallments')
                        : t('CheckoutShowInstallments')}{' '}
                      {t('CheckoutInstallmentOptions')}
                    </button>
                    {showInstallments && (
                      <div className="mt-3 p-4 bg-amber-50/50 border border-amber-200 rounded-lg animate-fade-in">
                        <p className="text-sm text-amber-800 mb-3">
                          {t('CheckoutInstallmentLimit')}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled
                            className="flex-1 py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed"
                          >
                            {t('CheckoutValuInstallment')}
                          </button>
                          <button
                            type="button"
                            disabled
                            className="flex-1 py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed"
                          >
                            {t('CheckoutTabbyInstallment')}
                          </button>
                        </div>
                        <p className="text-xs text-amber-600 mt-2">
                          {t('CheckoutInstallmentsSoon')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Notes & Gift Wrapping */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2
                  className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">
                    5
                  </span>
                  {t('CheckoutAdditionalOptions')}
                </h2>

                <div className="space-y-4">
                  {/* Gift Wrapping */}
                  <label
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${giftWrapping ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={giftWrapping}
                        onChange={e => setGiftWrapping(e.target.checked)}
                        className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a] rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">{t('CheckoutGiftWrapping')}</div>
                        <div className="text-sm text-gray-500">{t('CheckoutGiftWrappingDesc')}</div>
                      </div>
                    </div>
                    <div className="font-bold text-[#1e3b8a]">
                      +{giftWrapFee.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                    </div>
                  </label>

                  {/* Order Notes */}
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('CheckoutOrderNotes')}
                    </label>
                    <textarea
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      placeholder={t('CheckoutOrderNotesPlaceholder')}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none resize-none"
                      maxLength={500}
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {orderNotes.length.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}/
                      {(500).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                      {t('CheckoutCharacters')}
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-full lg:w-1/3">
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('CheckoutSummary')}</h2>

              <div className="divide-y divide-gray-100 mb-6">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-3"
                    style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                  >
                    <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {item.image && item.image.startsWith('http') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('CheckoutQty')}:{' '}
                        {item.qty.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </div>
                      <div className="text-sm font-bold text-[#1e3b8a] mt-1">
                        {(item.price * item.qty).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                        {t('EGP')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>
                    {t('Subtotal')} (
                    {items.length.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                    {t('CheckoutItemsCount')})
                  </span>
                  <span className="font-medium text-gray-900">
                    {subtotal.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                  </span>
                </div>
                {pointsToUse > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>{t('CheckoutLoyaltyPoints')}</span>
                    <span className="font-medium">
                      -{pointsToUse.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                    </span>
                  </div>
                )}
                {couponApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('CheckoutCouponApplied')}</span>
                    <span className="font-medium">
                      -{couponDiscount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>{t('Shipping')}</span>
                  <span className="font-medium text-gray-900">
                    {shipping.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                  </span>
                </div>
                {giftWrapping && (
                  <div className="flex justify-between text-pink-600">
                    <span>{t('CheckoutGiftWrapping')}</span>
                    <span className="font-medium">
                      +{giftWrapFee.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>
                    {t('CheckoutVat')} (
                    {(vatRate * 100).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                      maximumFractionDigits: 0,
                    })}
                    %)
                  </span>
                  <span className="font-medium text-gray-900">
                    {vatAmount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {t('EGP')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-900 border-t border-gray-100 pt-3">
                  <span className="font-bold text-base">{t('Total')}</span>
                  <span className="font-black text-xl text-[#1e3b8a]">
                    {grandTotal.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('EGP')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isLoading}
                className="w-full bg-[#1e3b8a] hover:bg-[#152c6e] text-white font-bold py-4 rounded-xl shadow-lg transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? t('Processing')
                  : `${t('PlaceOrder')} — ${grandTotal.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${t('EGP')}`}
              </button>

              <div className="mt-4 text-xs text-center text-gray-500 flex items-center justify-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t('CheckoutSecureSSL')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}
