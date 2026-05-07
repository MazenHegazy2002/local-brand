'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ReturnsRefundsPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">← Back to Legal</Link>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Returns & Refunds Policy</h1>
          <p className="text-gray-500">How to return items and get your money back</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">14-Day Return Window</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              We want you to love your purchase. If you&apos;re not completely satisfied, you may return most items within 
              <strong> 14 days of delivery</strong> for a full refund.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-semibold">✓ Eligible for return</p>
              <p className="text-green-700 text-sm">Items must be in original condition with all tags attached</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Eligible Items</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-700">Unworn clothing with tags attached</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-700">Unopened electronics in original packaging</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-700">Unused home goods with original accessories</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-700">Sealed beauty products (not opened)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
              <span className="text-gray-700">Books and media in original condition</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Non-Eligible Items</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">✕</span>
              <span className="text-gray-700">Personalized or customized items</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">✕</span>
              <span className="text-gray-700">Intimate apparel and swimwear</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">✕</span>
              <span className="text-gray-700">Opened beauty and skincare products</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">✕</span>
              <span className="text-gray-700">Perishable goods (food, flowers)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">✕</span>
              <span className="text-gray-700">Gift cards</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">✕</span>
              <span className="text-gray-700">Downloadable software</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">How to Request a Return</h2>
          <div className="space-y-4">
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                <div>
                  <h3 className="font-bold text-gray-900">Go to Your Orders</h3>
                  <p className="text-gray-600 text-sm">Visit your dashboard and select the order containing the item you wish to return.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                <div>
                  <h3 className="font-bold text-gray-900">Select &quot;Request Return&quot;</h3>
                  <p className="text-gray-600 text-sm">Choose the item(s) you want to return and select a reason from the dropdown.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                <div>
                  <h3 className="font-bold text-gray-900">Ship the Item</h3>
                  <p className="text-gray-600 text-sm">Use our prepaid return label or ship via any courier. Package securely with original packaging.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 font-bold">4</div>
                <div>
                  <h3 className="font-bold text-gray-900">Get Your Refund</h3>
                  <p className="text-gray-600 text-sm">Refunds are processed within 5-7 business days after seller confirmation.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Refund Timeline</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">📦</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Day 1-2: Return Received</h3>
                <p className="text-gray-600 text-sm">Seller confirms receipt of returned item</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">🔍</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Day 3-4: Inspection</h3>
                <p className="text-gray-600 text-sm">Seller inspects item to verify condition</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">💳</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Day 5-7: Refund Issued</h3>
                <p className="text-gray-600 text-sm">Refund credited to original payment method or LocalBrand wallet</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Condition Requirements</h2>
          <div className="space-y-4">
            <p className="text-gray-600">To receive a full refund, returned items must be:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">In original packaging (box, bag, etc.)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">All tags attached and labels intact</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Unused and unworn</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Clean and undamaged</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Contact Returns Support</h2>
          <p className="text-gray-600 mb-4">Need help with a return? Contact us:</p>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> returns@localbrand.eg</p>
            <p><strong>Phone:</strong> 16171 (Daily 9 AM - 9 PM)</p>
            <p><strong>WhatsApp:</strong> +20 100 000 0000</p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          Last updated: May 2026 — <Link href="/legal" className="text-[#1e3b8a] hover:underline">Back to Legal</Link>
        </div>
      </div>
    </div>
  );
}