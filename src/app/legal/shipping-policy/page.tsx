import { getServerTr } from '@/lib/i18n/server';
import LegalPageLoader from '../_components/LegalPageLoader';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Shipping Policy',
  description:
    'Brandyy marketplace shipping policy — delivery times and costs across all Egyptian governorates',
};

const governorateDelivery = [
  { name: 'Cairo', time: '1-2 days', cost: 'Free > 1500 EGP' },
  { name: 'Giza', time: '1-2 days', cost: 'Free > 1500 EGP' },
  { name: 'Alexandria', time: '2-3 days', cost: 'Free > 1500 EGP' },
  { name: 'Delta (Qalyubia, Dakahlia, Sharkia)', time: '2-3 days', cost: 'Free > 1500 EGP' },
  { name: 'Suez Canal (Port Said, Ismailia)', time: '3-4 days', cost: '35 EGP' },
  { name: 'Upper Egypt (Assiut, Minya)', time: '4-5 days', cost: '45 EGP' },
  { name: 'South Egypt (Qena, Luxor, Aswan)', time: '5-7 days', cost: '55 EGP' },
  { name: 'Frontier Governorates', time: '7-10 days', cost: '65 EGP' },
];

async function StaticContent() {
  const tr = await getServerTr();
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/legal" className="text-sm text-[#1e3b8a] hover:underline mb-4 block">
            {tr('← Back to Legal')}
          </Link>
          <h1 className="text-4xl font-black text-gray-900 mb-2">{tr('Shipping Policy')}</h1>
          <p className="text-gray-500">{tr('Delivery information for Egyptian customers')}</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
            {tr('Delivery Timeframes by Governorate')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-start py-3 text-gray-500 font-semibold text-sm">
                    {tr('Governorate')}
                  </th>
                  <th className="text-start py-3 text-gray-500 font-semibold text-sm">
                    {tr('Delivery Time')}
                  </th>
                  <th className="text-start py-3 text-gray-500 font-semibold text-sm">
                    {tr('Shipping Cost')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {governorateDelivery.map((gov, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-4 text-gray-900 font-medium">{gov.name}</td>
                    <td className="py-4 text-gray-600">{gov.time}</td>
                    <td className="py-4">
                      <span
                        className={`text-sm font-semibold ${gov.cost.includes('Free') ? 'text-green-600' : 'text-gray-900'}`}
                      >
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
            {tr('Free Shipping')}
          </h2>
          <div className="space-y-4">
            {[
              {
                title: tr('Free Shipping Threshold'),
                desc: tr(
                  'Enjoy free shipping on all orders over 1500 EGP delivered to Cairo, Giza, and Alexandria.'
                ),
              },
              {
                title: tr('Same-Day Delivery'),
                desc: tr(
                  'For orders placed before 12:00 PM in Cairo and Giza, same-day delivery is available for a flat 25 EGP fee.'
                ),
              },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                  ✓
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
            {tr('Order Tracking')}
          </h2>
          <p className="text-gray-600 mb-4">{tr("Once your order ships, you'll receive:")}</p>
          <ul className="space-y-3">
            {[
              'SMS notification with tracking number',
              'Email with tracking link',
              'Track via My Orders in your dashboard',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1e3b8a] text-white rounded-full flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
            {tr('Delivery Attempts')}
          </h2>
          <p className="text-gray-600 mb-4">
            {tr('Our courier partners will make up to')}{' '}
            <strong>{tr('3 delivery attempts')}</strong>. If you&apos;re not available:
          </p>
          <ul className="space-y-3">
            {[
              'Package left at your specified safe location',
              'Package transferred to nearest pickup point',
              'Returned to seller after 7 days',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
            {tr('Contact Shipping Support')}
          </h2>
          <p className="text-gray-600 mb-4">
            {tr('Have questions about your delivery? Contact us:')}
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{tr('Email:')}</strong> shipping@brandy.eg
            </p>
            <p>
              <strong>{tr('Phone:')}</strong> {tr('16171 (Daily 9 AM - 9 PM)')}
            </p>
            <p>
              <strong>{tr('WhatsApp:')}</strong> +20 100 000 0000
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          {tr('Last updated: May 2026 —')}{' '}
          <Link href="/legal" className="text-[#1e3b8a] hover:underline">
            {tr('Back to Legal')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ShippingPolicyPage() {
  return (
    <LegalPageLoader
      dbSlug="legal-shipping-policy"
      staticTitle="Shipping Policy"
      staticContent={<StaticContent />}
    />
  );
}
