'use client';

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Fire simple confetti effect if available, or just ignore
    try {
      if (typeof window !== 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        script.onload = () => {
          (window as any).confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#1e3b8a', '#facc15', '#1d9e75']
          });
        };
        document.body.appendChild(script);
      }
    } catch {}
  }, []);

  return (
    <div className="relative z-10">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>

      <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Order Confirmed!</h1>
      <p className="text-gray-500 text-lg mb-8 leading-relaxed max-w-md mx-auto">
        Thank you for supporting local Egyptian brands. We've received your order and are getting it ready for shipment.
      </p>

      <div className="bg-gray-50 rounded-xl p-6 mb-10 border border-gray-100 inline-block min-w-[280px]">
        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Order Reference</div>
        <div className="text-xl font-bold text-[#1e3b8a] font-mono">
          {orderId || "LCB-XXXX-XXXX"}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/dashboard" className="bg-[#1e3b8a] text-white font-bold py-4 px-8 rounded-xl hover:bg-[#152c6e] shadow-lg shadow-[#1e3b8a]/20 transition-all">
          Track My Order
        </Link>
        <Link href="/shop" className="bg-white text-gray-900 border border-gray-200 font-bold py-4 px-8 rounded-xl hover:bg-gray-50 transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-32 text-center">
        <div className="max-w-xl mx-auto bg-white p-10 md:p-16 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#facc15] opacity-20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#1e3b8a] opacity-10 rounded-full blur-3xl"></div>
          
          <Suspense fallback={<div className="relative z-10 py-10">Loading your order details...</div>}>
            <SuccessContent />
          </Suspense>
          
        </div>
      </div>
    </main>
  );
}
