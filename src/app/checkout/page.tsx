'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createOrder } from '@/app/actions/orders';
import Navbar from '@/components/Navbar';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const router = useRouter();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    governorate: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'CREDIT_CARD'>('CASH_ON_DELIVERY');
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<{id: string, amount: number} | null>(null);
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

  // Fetch user loyalty points
  useEffect(() => {
    if (session?.user) {
      fetch('/api/loyalty')
        .then(res => res.json())
        .then(data => {
          if (data.points !== undefined) {
            setLoyaltyPoints(data.points);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  // Calculations
  const subtotal = total();
  const couponDiscount = couponApplied?.amount || 0;
  const pointsDiscount = pointsToUse;
  const afterDiscount = subtotal - couponDiscount - pointsDiscount;
  const shipping = 50;
  const giftWrapFee = giftWrapping ? 25 : 0;
  const vatRate = 0.14;
  const vatAmount = Math.max(0, afterDiscount * vatRate);
  const grandTotal = Math.max(0, afterDiscount + shipping + vatAmount + giftWrapFee);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    
    try {
      const res = await fetch('/api/coupons/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, cartTotal: subtotal - pointsDiscount })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setCouponError(data.message || 'Invalid coupon');
        return;
      }
      
      setCouponApplied({ id: data.couponId, amount: data.discountAmount });
    } catch (err) {
      setCouponError('Failed to apply coupon');
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

  if (items.length === 0 && !isLoading) {
    return (
      <main className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center text-gray-500">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout is empty</h1>
          <p className="mb-6">You need to add products to your cart before proceeding.</p>
          <button onClick={() => router.push('/shop')} className="bg-[#1e3b8a] text-white font-bold py-3 px-8 rounded-lg">
            Return to Shop
          </button>
        </div>
      </main>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsLoading(true);
    setError('');

    try {
      // Deduct loyalty points if used
      if (pointsToUse > 0 && session?.user) {
        try {
          const { redeemLoyaltyPoints } = await import('@/app/actions/loyalty');
          const userId = (session.user as any).id;
          await redeemLoyaltyPoints(userId, pointsToUse);
        } catch (err) {
          console.error('Failed to redeem points:', err);
        }
      }

      const res = await createOrder(items, address, paymentMethod, couponApplied?.id || null);
      if (res.success) {
        clearCart();
        setCouponApplied(null);
        setPointsToUse(0);
        router.push(`/checkout/success?orderId=${res.orderId}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to place order");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Checkout</h1>
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column - Forms */}
          <div className="w-full lg:w-2/3 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium">
                {error}
              </div>
            )}
            
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
              
              {/* Shipping Address */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">1</span>
                  Shipping Address
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      value={address.fullName}
                      onChange={e => setAddress({...address, fullName: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none" 
                      placeholder="e.g. Ahmed Mohamed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                    <input 
                      required 
                      type="tel" 
                      value={address.phone}
                      onChange={e => setAddress({...address, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none" 
                      placeholder="e.g. 01234567890"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Street Address</label>
                    <input 
                      required 
                      type="text" 
                      value={address.address}
                      onChange={e => setAddress({...address, address: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none" 
                      placeholder="e.g. 12 El Nasr St, Building 4" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">City / District</label>
                    <input 
                      required 
                      type="text"
                      value={address.city}
                      onChange={e => setAddress({...address, city: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none" 
                      placeholder="e.g. Maadi, New Cairo" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Governorate</label>
                    <select 
                      required
                      value={address.governorate}
                      onChange={e => setAddress({...address, governorate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white"
                    >
                      <option value="">Select Governorate</option>
                      <option value="Cairo">Cairo</option>
                      <option value="Giza">Giza</option>
                      <option value="Alexandria">Alexandria</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loyalty Points */}
              {session && loyaltyPoints > 0 && (
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">2</span>
                    Loyalty Points
                  </h2>
                  
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div>
                      <div className="font-bold text-purple-800">Available: {loyaltyPoints} points</div>
                      <div className="text-sm text-purple-600">1 point = 1 EGP discount</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={Math.min(loyaltyPoints, subtotal - couponDiscount)}
                        value={pointsToUse || ''}
                        onChange={e => handlePointsChange(parseInt(e.target.value) || 0)}
                        placeholder="Use points"
                        className="w-24 border border-purple-300 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <span className="text-sm text-purple-600">= {pointsToUse} EGP</span>
                    </div>
                  </div>
                  {pointsError && <p className="text-red-500 text-sm mt-2">{pointsError}</p>}
                </div>
              )}

              {/* Promo Code */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">3</span>
                  Promo Code
                </h2>
                
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">✓</div>
                      <div>
                        <div className="font-bold text-green-800">Coupon Applied</div>
                        <div className="text-sm text-green-600">You saved {couponDiscount.toLocaleString()} EGP</div>
                      </div>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-green-700 hover:text-green-900 text-sm font-medium">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="bg-[#1e3b8a] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#152c6e] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applyingCoupon ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-red-500 text-sm mt-2">{couponError}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">4</span>
                  Payment Method
                </h2>
                
                <div className="space-y-4">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="CASH_ON_DELIVERY"
                      checked={paymentMethod === 'CASH_ON_DELIVERY'}
                      onChange={() => { setPaymentMethod('CASH_ON_DELIVERY'); setShowInstallments(false); }}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">Cash on Delivery</div>
                      <div className="text-sm text-gray-500">Pay when your order arrives</div>
                    </div>
                    <div className="text-3xl">💵</div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'CREDIT_CARD' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="CREDIT_CARD"
                      checked={paymentMethod === 'CREDIT_CARD'}
                      onChange={() => { setPaymentMethod('CREDIT_CARD'); setShowInstallments(false); }}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">Credit / Debit Card</div>
                      <div className="text-sm text-gray-500">Secure payment via Stripe</div>
                    </div>
                    <div className="text-3xl">💳</div>
                  </label>

                  {/* Express Payment Buttons */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-3">Or express checkout with</p>
                      <div className="flex gap-3">
                        <button type="button" disabled className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
                          <span>🍎</span> Apple Pay
                        </button>
                        <button type="button" disabled className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-center gap-2">
                          <span>🔷</span> Google Pay
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Express payment requires Stripe setup</p>
                    </div>
                  )}
                </div>

                {/* Installment Option */}
                {paymentMethod === 'CREDIT_CARD' && grandTotal >= 1000 && (
                  <div className="mt-4">
                    <button 
                      type="button"
                      onClick={() => setShowInstallments(!showInstallments)}
                      className="text-sm text-[#1e3b8a] font-medium flex items-center gap-2"
                    >
                      <span>📊</span> 
                      {showInstallments ? 'Hide' : 'Show'} installment options (valU / Tabby)
                    </button>
                    {showInstallments && (
                      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 mb-3">
                          Available for orders over 1,000 EGP. Pay in 3-6 easy installments.
                        </p>
                        <div className="flex gap-2">
                          <button type="button" disabled className="flex-1 py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
                            valU (3-6 months)
                          </button>
                          <button type="button" disabled className="flex-1 py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
                            Tabby (4 payments)
                          </button>
                        </div>
                        <p className="text-xs text-amber-600 mt-2">Installment payment integration coming soon</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Notes & Gift Wrapping */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">5</span>
                  Additional Options
                </h2>
                
                <div className="space-y-4">
                  {/* Gift Wrapping */}
                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${giftWrapping ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={giftWrapping}
                        onChange={(e) => setGiftWrapping(e.target.checked)}
                        className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a] rounded"
                      />
                      <div>
                        <div className="font-bold text-gray-900">🎁 Gift Wrapping</div>
                        <div className="text-sm text-gray-500">Add premium gift packaging</div>
                      </div>
                    </div>
                    <div className="font-bold text-[#1e3b8a]">+25 EGP</div>
                  </label>

                  {/* Order Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Order Notes (Optional)</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Special instructions for your order..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#1e3b8a] outline-none resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1">{orderNotes.length}/500 characters</p>
                  </div>
                </div>
              </div>

            </form>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="divide-y divide-gray-100 mb-6">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4 py-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {item.image && item.image.startsWith('http') ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                      <div className="text-xs text-gray-500 mt-1">Qty: {item.qty}</div>
                      <div className="text-sm font-bold text-[#1e3b8a] mt-1">{(item.price * item.qty).toLocaleString()} EGP</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-medium text-gray-900">{subtotal.toLocaleString()} EGP</span>
                </div>
                {pointsToUse > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Loyalty Points</span>
                    <span className="font-medium">-{pointsToUse} EGP</span>
                  </div>
                )}
                {couponApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span className="font-medium">-{couponDiscount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Fee</span>
                  <span className="font-medium text-gray-900">{shipping.toLocaleString()} EGP</span>
                </div>
                {giftWrapping && (
                  <div className="flex justify-between text-pink-600">
                    <span>Gift Wrapping</span>
                    <span className="font-medium">+{giftWrapFee} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Estimated VAT ({(vatRate * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-gray-900">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} EGP</span>
                </div>
                <div className="flex justify-between text-gray-900 border-t border-gray-100 pt-3">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-black text-xl text-[#1e3b8a]">{grandTotal.toLocaleString()} EGP</span>
                </div>
              </div>

              <button 
                type="submit" 
                form="checkout-form"
                disabled={isLoading}
                className="w-full bg-[#1e3b8a] hover:bg-[#152c6e] text-white font-bold py-4 rounded-xl shadow-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : `Place Order — ${grandTotal.toLocaleString()} EGP`}
              </button>
              
              <div className="mt-4 text-xs text-center text-gray-500 flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secure 256-bit SSL encrypted payment
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}