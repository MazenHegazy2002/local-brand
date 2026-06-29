'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Accordion } from '@/components/ui/Accordion';

type Category = 'orders' | 'shipping' | 'returns' | 'payments' | 'account' | 'sellers';

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'shipping', label: 'Shipping', icon: '🚚' },
  { id: 'returns', label: 'Returns & Refunds', icon: '↩️' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'account', label: 'My Account', icon: '👤' },
  { id: 'sellers', label: 'Selling on Brandy', icon: '🏪' },
];

export const FAQ_DATA: Record<Category, Array<{ q: string; a: string }>> = {
  orders: [
    {
      q: 'How do I place an order?',
      a: 'Browse products, add items to your cart, and proceed to checkout. You can pay with cash on delivery, card, or mobile wallet.',
    },
    {
      q: 'Can I modify my order after placing it?',
      a: 'Orders in PENDING_PAYMENT or CONFIRMED status can be cancelled from your dashboard. Once shipped, contact the seller for changes.',
    },
    {
      q: 'How do I track my order?',
      a: 'Go to Dashboard → My Orders and click any order to see live tracking updates.',
    },
    {
      q: 'Can I buy as a guest?',
      a: 'Yes — checkout supports guest email. You can track the order using the email link sent after purchase.',
    },
  ],
  shipping: [
    {
      q: 'What are the shipping rates?',
      a: 'Shipping starts at 40 EGP for Cairo/Giza, 55 EGP for Alexandria, and 75 EGP for other governorates.',
    },
    {
      q: 'How long does delivery take?',
      a: 'Standard delivery: 2-4 business days for Cairo/Giza, 3-7 days for other governorates.',
    },
    { q: 'Is free shipping available?', a: 'Yes, on orders over 500 EGP throughout Egypt.' },
    { q: 'Do you ship internationally?', a: 'Not yet — we currently ship only within Egypt.' },
  ],
  returns: [
    {
      q: 'What is your return policy?',
      a: 'You have 14 days from delivery to request a return. Items must be unused and in original packaging.',
    },
    {
      q: 'How do I request a return?',
      a: 'Go to Dashboard → My Orders, find the delivered item, and click the "Return" button.',
    },
    {
      q: 'When will I get my refund?',
      a: 'Refunds are processed within 5-7 business days after we receive and inspect the returned item.',
    },
    {
      q: 'Who pays for return shipping?',
      a: 'If the product is defective or wrongly shipped, we cover return shipping. For change-of-mind returns, shipping is deducted from the refund.',
    },
  ],
  payments: [
    {
      q: 'What payment methods do you accept?',
      a: 'Cash on Delivery, Credit/Debit Cards (Stripe), and Mobile Wallets (Vodafone Cash, Orange Money, Etisalat Cash).',
    },
    {
      q: 'Is it safe to pay by card?',
      a: 'Yes, all card payments go through Stripe with 256-bit SSL encryption. We never store your card details.',
    },
    {
      q: 'Can I pay in installments?',
      a: 'Installment options via valU and Tabby are available for orders over 1,000 EGP (coming soon).',
    },
    {
      q: 'Are loyalty points a currency?',
      a: '1 point = 1 EGP. You can redeem them at checkout for any order.',
    },
  ],
  account: [
    {
      q: 'How do I create an account?',
      a: 'Click "Sign up" in the top-right corner. You can sign up with email or continue with Google.',
    },
    {
      q: 'I forgot my password.',
      a: 'Click "Forgot password?" on the login page. We\'ll email you a reset link.',
    },
    {
      q: 'How do I delete my account?',
      a: 'Dashboard → Settings → Danger Zone → Delete My Account. Your personal data will be anonymized per PDPL.',
    },
    {
      q: 'Can I download my data?',
      a: 'Yes — you have the right to export your data. Contact support to request a full data export.',
    },
  ],
  sellers: [
    {
      q: 'How do I become a seller?',
      a: 'Click "Sell" in the navigation, fill out the application, and our team will review it within 2-3 business days.',
    },
    {
      q: 'What is the commission rate?',
      a: 'The platform retains 15% commission on each sale. You keep 85% of the item price.',
    },
    {
      q: 'When do I get paid?',
      a: 'Funds are held in escrow for 7 days after delivery. After clearance, you can request a withdrawal from your Seller Hub.',
    },
    {
      q: 'Can I sell non-Egyptian products?',
      a: 'Our focus is Egyptian-made brands. Non-Egyptian products can be listed but won\'t earn the "Verified Local" badge.',
    },
  ],
};

export default function FAQClient() {
  const [activeCategory, setActiveCategory] = useState<Category>('orders');
  const [search, setSearch] = useState('');

  const accordionItems = (() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return Object.entries(FAQ_DATA).flatMap(([cat, faqs]) =>
        faqs
          .filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
          .map((f, i) => ({ id: `${cat}-${i}`, title: f.q, content: f.a }))
      );
    }
    return FAQ_DATA[activeCategory].map((f, i) => ({
      id: `${activeCategory}-${i}`,
      title: f.q,
      content: f.a,
    }));
  })();

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">Help Center</h1>
            <p className="text-gray-500 text-lg">Frequently asked questions and answers</p>
          </div>

          <div className="mb-8">
            <label htmlFor="faq-search" className="sr-only">
              Search FAQs
            </label>
            <input
              id="faq-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search FAQs..."
              aria-label="Search frequently asked questions"
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#1e3b8a] outline-none text-base shadow-sm"
            />
          </div>

          {!search.trim() && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  aria-pressed={activeCategory === c.id}
                  className={`p-4 rounded-2xl text-left transition-all border-2 ${
                    activeCategory === c.id
                      ? 'bg-[#1e3b8a] text-white border-[#1e3b8a] shadow-md'
                      : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="font-bold text-sm">{c.label}</div>
                </button>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
            {accordionItems.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                No FAQs match &quot;{search}&quot;. Try a different search term.
              </div>
            ) : (
              <Accordion items={accordionItems} allowMultipleOpen />
            )}
          </div>

          <div className="mt-12 p-6 md:p-8 bg-gradient-to-br from-[#1e3b8a]/5 to-[#0F6E56]/5 rounded-2xl border border-[#1e3b8a]/20 text-center">
            <h3 className="text-xl font-black text-gray-900 mb-2">Still need help?</h3>
            <p className="text-gray-600 mb-4">Our support team is here for you.</p>
            <a
              href="/help/contact"
              className="inline-flex items-center gap-2 bg-[#1e3b8a] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#152c6e] transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
