import LegalPageLoader from '../_components/LegalPageLoader';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Returns & Refunds Policy',
  description: 'Brandy marketplace returns and refunds policy — 14-day return window across Egypt',
};

const staticContent = (
  <div className="min-h-screen bg-[#faf9f6]">
    <Navbar />
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">
          ← Back to Legal
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-2">Returns &amp; Refunds Policy</h1>
        <p className="text-gray-500">How to return items and get your money back</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          14-Day Return Window
        </h2>
        <p className="text-gray-600 mb-4">
          We want you to love your purchase. If you&apos;re not completely satisfied, you may return
          most items within
          <strong> 14 days of delivery</strong> for a full refund.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-800 font-semibold">✓ Eligible for return</p>
          <p className="text-green-700 text-sm">
            Items must be in original condition with all tags attached
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Eligible Items
        </h2>
        <ul className="space-y-3">
          {[
            'Unworn clothing with tags attached',
            'Unopened electronics in original packaging',
            'Unused home goods with original accessories',
            'Sealed beauty products (not opened)',
            'Books and media in original condition',
          ].map(item => (
            <li key={item} className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                ✓
              </span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Non-Eligible Items
        </h2>
        <ul className="space-y-3">
          {[
            'Personalized or customized items',
            'Intimate apparel and swimwear',
            'Opened beauty and skincare products',
            'Perishable goods (food, flowers)',
            'Gift cards',
            'Downloadable software',
          ].map(item => (
            <li key={item} className="flex items-center gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                ✕
              </span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          How to Request a Return
        </h2>
        <ol className="space-y-4">
          {[
            {
              title: 'Go to Your Orders',
              desc: 'Visit your dashboard and select the order containing the item you wish to return.',
            },
            {
              title: 'Select "Request Return"',
              desc: 'Choose the item(s) you want to return and select a reason from the dropdown.',
            },
            {
              title: 'Ship the Item',
              desc: 'Use our prepaid return label or ship via any courier. Package securely with original packaging.',
            },
            {
              title: 'Get Your Refund',
              desc: 'Refunds are processed within 5-7 business days after seller confirmation.',
            },
          ].map(({ title, desc }, i) => (
            <li key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 font-bold">
                {i + 1}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Refund Timeline
        </h2>
        <div className="space-y-4">
          {[
            {
              icon: '📦',
              title: 'Day 1-2: Return Received',
              desc: 'Seller confirms receipt of returned item',
            },
            {
              icon: '🔍',
              title: 'Day 3-4: Inspection',
              desc: 'Seller inspects item to verify condition',
            },
            {
              icon: '💳',
              title: 'Day 5-7: Refund Issued',
              desc: 'Refund credited to original payment method or Brandy wallet',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Condition Requirements
        </h2>
        <p className="text-gray-600 mb-4">To receive a full refund, returned items must be:</p>
        <ul className="space-y-3">
          {[
            'In original packaging (box, bag, etc.)',
            'All tags attached and labels intact',
            'Unused and unworn',
            'Clean and undamaged',
          ].map(item => (
            <li key={item} className="flex items-center gap-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                ✓
              </span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Contact Returns Support
        </h2>
        <p className="text-gray-600 mb-4">Need help with a return? Contact us:</p>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Email:</strong> returns@brandy.eg
          </p>
          <p>
            <strong>Phone:</strong> 16171 (Daily 9 AM - 9 PM)
          </p>
          <p>
            <strong>WhatsApp:</strong> +20 100 000 0000
          </p>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-gray-400">
        Last updated: May 2026 —{' '}
        <Link href="/legal" className="text-[#1e3b8a] hover:underline">
          Back to Legal
        </Link>
      </div>
    </div>
  </div>
);

export default function ReturnsRefundsPage() {
  return (
    <LegalPageLoader
      dbSlug="legal-returns-refunds"
      staticTitle="Returns & Refunds Policy"
      staticContent={staticContent}
    />
  );
}
