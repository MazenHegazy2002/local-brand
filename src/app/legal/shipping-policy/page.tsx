'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

const governorateDelivery = [
  { name: 'Cairo', time: '1-2 days', cost: 'Free > 500 EGP' },
  { name: 'Giza', time: '1-2 days', cost: 'Free > 500 EGP' },
  { name: 'Alexandria', time: '2-3 days', cost: 'Free > 500 EGP' },
  { name: 'Delta (Qalyubia, Dakahlia, Sharkia)', time: '2-3 days', cost: 'Free > 500 EGP' },
  { name: 'Suez Canal (Port Said, Ismailia)', time: '3-4 days', cost: '35 EGP' },
  { name: 'Upper Egypt (Assiut, Minya)', time: '4-5 days', cost: '45 EGP' },
  { name: 'South Egypt (Qena, Luxor, Aswan)', time: '5-7 days', cost: '55 EGP' },
  { name: 'Frontier Governorates', time: '7-10 days', cost: '65 EGP' },
];

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">← Back to Legal</Link>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Shipping Policy</h1>
          <p className="text-gray-500">Delivery information for Egyptian customers</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Delivery Timeframes by Governorate</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-gray-500 font-semibold text-sm">Governorate</th>
                  <th className="text-left py-3 text-gray-500 font-semibold text-sm">Delivery Time</th>
                  <th className="text-left py-3 text-gray-500 font-semibold text-sm">Shipping Cost</th>
                </tr>
              </thead>
              <tbody>
                {governorateDelivery.map((gov, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-4 text-gray-900 font-medium">{gov.name}</td>
                    <td className="py-4 text-gray-600">{gov.time}</td>
                    <td className="py-4">
                      <span className={`text-sm font-semibold ${gov.cost.includes('Free') ? 'text-green-600' : 'text-gray-900'}`}>
                        {gov.cost}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Free Shipping</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">✓</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Free Shipping Threshold</h3>
                <p className="text-gray-600 text-sm">Enjoy free shipping on all orders over 500 EGP delivered to Cairo, Giza, and Alexandria.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">✓</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Same-Day Delivery</h3>
                <p className="text-gray-600 text-sm">For orders placed before 12:00 PM in Cairo and Giza, same-day delivery is available for a flat 25 EGP fee.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Order Tracking</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Once your order ships, you&apos;ll receive:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center text-xs">1</span>
                <span className="text-gray-700">SMS notification with tracking number</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center text-xs">2</span>
                <span className="text-gray-700">Email with tracking link</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center text-xs">3</span>
                <span className="text-gray-700">Track via My Orders in your dashboard</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Delivery Attempts</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Our courier partners will make up to <strong>3 delivery attempts</strong>. If you&apos;re not available:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs">1</span>
                <span className="text-gray-700">Package left at your specified safe location</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs">2</span>
                <span className="text-gray-700">Package transferred to nearest pickup point</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs">3</span>
                <span className="text-gray-700">Returned to seller after 7 days</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Contact Shipping Support</h2>
          <p className="text-gray-600 mb-4">Have questions about your delivery? Contact us:</p>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> shipping@localbrand.eg</p>
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