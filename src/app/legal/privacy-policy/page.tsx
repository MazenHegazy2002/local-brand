import LegalPageLoader from '../_components/LegalPageLoader';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy — PDPL (Law No. 151 of 2020) compliance for Brandy Egypt marketplace',
};

const staticContent = (
  <div className="min-h-screen bg-[#faf9f6]">
    <Navbar />
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">
          ← Back to Legal
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-2">Privacy Policy (PDPL)</h1>
        <p className="text-gray-500">
          Personal Data Protection Law (Law No. 151 of 2020) Compliance
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Data Controller Information
        </h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            <strong>Brandy Egypt</strong> (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            operates the Brandy marketplace platform. We are committed to protecting your personal
            data in compliance with Egypt&apos;s Personal Data Protection Law (Law No. 151 of 2020).
          </p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm">
              <strong>Registered Entity:</strong> Brandy Egypt LLC
            </p>
            <p className="text-sm">
              <strong>Registration No.:</strong> 12345/2024
            </p>
            <p className="text-sm">
              <strong>Address:</strong> Cairo, Egypt
            </p>
            <p className="text-sm">
              <strong>Data Protection Officer:</strong> dpo@brandy.eg
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          What Data We Collect
        </h2>
        <div className="space-y-4">
          <p className="text-gray-600">We collect the following types of personal data:</p>
          <ul className="space-y-3">
            {[
              {
                n: 1,
                label: 'Account Information',
                desc: 'Name, email address, phone number, shipping/billing addresses',
              },
              {
                n: 2,
                label: 'Order & Transaction Data',
                desc: 'Purchase history, order details, payment information, delivery preferences',
              },
              {
                n: 3,
                label: 'Device & Usage Data',
                desc: 'IP address, browser type, device information, cookies, browsing behavior',
              },
              {
                n: 4,
                label: 'Communication Data',
                desc: 'Customer support communications, reviews, feedback',
              },
              {
                n: 5,
                label: 'Location Data',
                desc: 'General location for delivery estimates (not precise GPS)',
              },
            ].map(({ n, label, desc }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {n}
                </span>
                <div>
                  <span className="font-semibold text-gray-900">{label}</span>
                  <p className="text-gray-600 text-sm">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          How We Use Your Data
        </h2>
        <ul className="space-y-3">
          {[
            'Processing and fulfilling orders',
            'Payment processing and fraud prevention',
            'Delivery and shipping',
            'Customer support and service',
            'Personalized recommendations and marketing',
            'Legal and regulatory compliance',
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
          Data Sharing
        </h2>
        <p className="text-gray-600 mb-4">We may share your data with:</p>
        <ul className="space-y-3 mb-4">
          {[
            {
              n: 1,
              label: 'Sellers',
              desc: 'Order fulfillment — only order details necessary for delivery',
            },
            { n: 2, label: 'Shipping Partners', desc: 'Courier services for delivery' },
            {
              n: 3,
              label: 'Payment Processors',
              desc: 'Secure payment processing (PCI-DSS compliant)',
            },
            { n: 4, label: 'Legal Authorities', desc: 'When required by Egyptian law' },
          ].map(({ n, label, desc }) => (
            <li key={n} className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </span>
              <div>
                <span className="font-semibold text-gray-900">{label}</span>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-semibold">
            We do NOT sell your personal data to third parties.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Data Retention
        </h2>
        <ul className="space-y-3">
          {[
            { label: 'Account data', val: 'While active + 3 years after closure' },
            { label: 'Order data', val: '7 years (Egyptian tax law requirement)' },
            { label: 'Marketing data', val: 'Until you unsubscribe' },
            { label: 'Analytics data', val: '2 years (anonymized)' },
          ].map(({ label, val }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                📅
              </span>
              <span className="text-gray-700">
                <strong>{label}:</strong> {val}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Your Rights Under PDPL
        </h2>
        <p className="text-gray-600 mb-4">
          Under Law No. 151 of 2020, you have the following rights:
        </p>
        <ul className="space-y-3">
          {[
            { n: 1, label: 'Right to Access', desc: 'Request a copy of your personal data' },
            { n: 2, label: 'Right to Correction', desc: 'Request correction of inaccurate data' },
            {
              n: 3,
              label: 'Right to Deletion',
              desc: 'Request deletion of your data ("right to be forgotten")',
            },
            { n: 4, label: 'Right to Restrict Processing', desc: 'Limit how we use your data' },
            {
              n: 5,
              label: 'Right to Data Portability',
              desc: 'Request your data in a machine-readable format',
            },
            { n: 6, label: 'Right to Object', desc: 'Object to processing for marketing' },
          ].map(({ n, label, desc }) => (
            <li key={n} className="flex items-start gap-3">
              <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold">
                {n}
              </span>
              <div>
                <span className="font-semibold text-gray-900">{label}</span>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-gray-600 text-sm mt-4">
          To exercise any of these rights, contact <strong>dpo@brandy.eg</strong> or use the Data
          Export feature in your dashboard.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
          Contact Data Protection Officer
        </h2>
        <p className="text-gray-600 mb-4">
          For data protection inquiries or to exercise your rights:
        </p>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Email:</strong> dpo@brandy.eg
          </p>
          <p>
            <strong>Phone:</strong> 16171
          </p>
          <p>
            <strong>Address:</strong> Data Protection Officer, Brandy Egypt, Cairo, Egypt
          </p>
        </div>
        <p className="text-gray-600 text-sm mt-4">
          We will respond to your request within <strong>30 days</strong> as required by PDPL.
        </p>
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

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLoader
      dbSlug="legal-privacy-policy"
      staticTitle="Privacy Policy (PDPL)"
      staticContent={staticContent}
    />
  );
}
