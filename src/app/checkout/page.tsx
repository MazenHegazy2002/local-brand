'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/app/actions/orders';
import Navbar from '@/components/Navbar';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [address, setAddress] = useState({
    street: '',
    city: '',
    governorate: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'CREDIT_CARD'>('CASH_ON_DELIVERY');

  const subtotal = total();
  const shipping = 50;
  const vatRate = 0.14; // Default VAT rate
  const vatAmount = subtotal * vatRate;
  const grandTotal = subtotal + shipping + vatAmount;

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
      const res = await createOrder(items, address, paymentMethod);
      if (res.success) {
        clearCart();
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Street Address</label>
                    <input 
                      required 
                      type="text" 
                      value={address.street}
                      onChange={e => setAddress({...address, street: e.target.value})}
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

              {/* Payment Method */}
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center text-sm">2</span>
                  Payment Method
                </h2>
                
                <div className="space-y-4">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'CASH_ON_DELIVERY' ? 'border-[#1e3b8a] bg-[#1e3b8a]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="CASH_ON_DELIVERY"
                      checked={paymentMethod === 'CASH_ON_DELIVERY'}
                      onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
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
                      onChange={() => setPaymentMethod('CREDIT_CARD')}
                      className="w-5 h-5 text-[#1e3b8a] focus:ring-[#1e3b8a]"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">Credit / Debit Card</div>
                      <div className="text-sm text-gray-500">A mock successful payment will be simulated.</div>
                    </div>
                    <div className="text-3xl">💳</div>
                  </label>
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
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">{item.emoji ?? '📦'}</div>
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
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Fee</span>
                  <span className="font-medium text-gray-900">{shipping.toLocaleString()} EGP</span>
                </div>
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
