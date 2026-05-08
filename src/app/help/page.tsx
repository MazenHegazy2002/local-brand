import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Help Center | Local Brand',
  description: 'Find answers to common questions or contact our support team.',
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">Help Center</h1>
          <p className="text-gray-500 text-lg">
            Find answers, get in touch, or learn how Local Brand works.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link
            href="/help/faq"
            className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[#1e3b8a]/30 hover:shadow-md transition-all text-center group"
          >
            <div className="text-4xl mb-3">❓</div>
            <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#1e3b8a]">FAQ</h3>
            <p className="text-sm text-gray-500">Browse frequently asked questions by category.</p>
          </Link>
          <Link
            href="/help/contact"
            className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-[#1e3b8a]/30 hover:shadow-md transition-all text-center group"
          >
            <div className="text-4xl mb-3">✉️</div>
            <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#1e3b8a]">Contact Support</h3>
            <p className="text-sm text-gray-500">Submit a ticket — we reply within 24 hours.</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-black text-gray-900 mb-4">Popular Questions</h2>
            <div className="space-y-4">
              {[
                { q: 'How do I track my order?', a: 'You can track your order by visiting the Orders section in your dashboard.' },
                { q: 'What is your return policy?', a: 'We accept returns within 14 days of delivery. Items must be unused and in original packaging.' },
                { q: 'How do I become a seller?', a: 'Click on Sell in the navigation and fill out the application form.' },
                { q: 'What payment methods do you accept?', a: 'Cash on Delivery, Credit/Debit Cards (Stripe), and Mobile Wallets (Vodafone Cash, Orange Money, Etisalat Cash).' },
              ].map((faq, i) => (
                <div key={i} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-black text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link href="/help/faq" className="text-sm font-bold text-[#1e3b8a] hover:underline">
                View all FAQs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
