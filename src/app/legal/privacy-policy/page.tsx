'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">← Back to Legal</Link>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Privacy Policy (PDPL)</h1>
          <p className="text-gray-500">Personal Data Protection Law (Law No. 151 of 2020) Compliance</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Data Controller Information</h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              <strong>Brandy Egypt</strong> (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Brandy marketplace platform. 
              We are committed to protecting your personal data in compliance with Egypt&apos;s Personal Data Protection Law (Law No. 151 of 2020).
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm"><strong>Registered Entity:</strong> Brandy Egypt LLC</p>
              <p className="text-sm"><strong>Registration No.:</strong> 12345/2024</p>
              <p className="text-sm"><strong>Address:</strong> Cairo, Egypt</p>
              <p className="text-sm"><strong>Data Protection Officer:</strong> dpo@brandy.eg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">What Data We Collect</h2>
          <div className="space-y-4">
            <p className="text-gray-600">We collect the following types of personal data:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold text-gray-900">Account Information</span>
                  <p className="text-gray-600 text-sm">Name, email address, phone number, shipping/billing addresses</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold text-gray-900">Order & Transaction Data</span>
                  <p className="text-gray-600 text-sm">Purchase history, order details, payment information, delivery preferences</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-semibold text-gray-900">Device & Usage Data</span>
                  <p className="text-gray-600 text-sm">IP address, browser type, device information, cookies, browsing behavior</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div>
                  <span className="font-semibold text-gray-900">Communication Data</span>
                  <p className="text-gray-600 text-sm">Customer support communications, reviews, feedback</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">5</span>
                <div>
                  <span className="font-semibold text-gray-900">Location Data</span>
                  <p className="text-gray-600 text-sm">General location for delivery estimates (not precise GPS)</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">How We Use Your Data</h2>
          <div className="space-y-4">
            <p className="text-gray-600">We process your personal data for the following purposes:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Processing and fulfilling orders</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Payment processing and fraud prevention</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Delivery and shipping</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Customer support and service</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Personalized recommendations and marketing</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">✓</span>
                <span className="text-gray-700">Legal and regulatory compliance</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Data Sharing</h2>
          <div className="space-y-4">
            <p className="text-gray-600">We may share your data with:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold text-gray-900">Sellers</span>
                  <p className="text-gray-600 text-sm">Order fulfillment - only order details necessary for delivery</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold text-gray-900">Shipping Partners</span>
                  <p className="text-gray-600 text-sm">Courier services for delivery</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-semibold text-gray-900">Payment Processors</span>
                  <p className="text-gray-600 text-sm">Secure payment processing (PCI-DSS compliant)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div>
                  <span className="font-semibold text-gray-900">Legal Authorities</span>
                  <p className="text-gray-600 text-sm">When required by Egyptian law</p>
                </div>
              </li>
            </ul>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-semibold">We do NOT sell your personal data to third parties.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Data Retention</h2>
          <div className="space-y-4">
            <p className="text-gray-600">We retain your data for the following periods:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">📅</span>
                <span className="text-gray-700"><strong>Account data:</strong> While account is active + 3 years after closure</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">📅</span>
                <span className="text-gray-700"><strong>Order data:</strong> 7 years (Egyptian tax law requirement)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">📅</span>
                <span className="text-gray-700"><strong>Marketing data:</strong> Until you unsubscribe</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">📅</span>
                <span className="text-gray-700"><strong>Analytics data:</strong> 2 years (anonymized)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Your Rights Under PDPL</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Under Law No. 151 of 2020, you have the following rights:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                <div>
                  <span className="font-semibold text-gray-900">Right to Access</span>
                  <p className="text-gray-600 text-sm">Request a copy of your personal data</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">2</span>
                <div>
                  <span className="font-semibold text-gray-900">Right to Correction</span>
                  <p className="text-gray-600 text-sm">Request correction of inaccurate data</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                <div>
                  <span className="font-semibold text-gray-900">Right to Deletion</span>
                  <p className="text-gray-600 text-sm">Request deletion of your data (&quot;right to be forgotten&quot;)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">4</span>
                <div>
                  <span className="font-semibold text-gray-900">Right to Restrict Processing</span>
                  <p className="text-gray-600 text-sm">Limit how we use your data</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">5</span>
                <div>
                  <span className="font-semibold text-gray-900">Right to Data Portability</span>
                  <p className="text-gray-600 text-sm">Request your data in a machine-readable format</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">6</span>
                <div>
                  <span className="font-semibold text-gray-900">Right to Object</span>
                  <p className="text-gray-600 text-sm">Object to processing for marketing</p>
                </div>
              </li>
            </ul>
            <p className="text-gray-600 text-sm mt-4">
              To exercise any of these rights, contact <strong>dpo@brandy.eg</strong> or use the Data Export feature in your dashboard.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Contact Data Protection Officer</h2>
          <div className="space-y-4">
            <p className="text-gray-600">For data protection inquiries or to exercise your rights:</p>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> dpo@brandy.eg</p>
              <p><strong>Phone:</strong> 16171</p>
              <p><strong>Address:</strong> Data Protection Officer, Brandy Egypt, Cairo, Egypt</p>
            </div>
            <p className="text-gray-600 text-sm">
              We will respond to your request within <strong>30 days</strong> as required by PDPL.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          Last updated: May 2026 — <Link href="/legal" className="text-[#1e3b8a] hover:underline">Back to Legal</Link>
        </div>
      </div>
    </div>
  );
}