'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

const sections = [
  {
    title: 'Terms of Service',
    id: 'terms',
    content: `Welcome to LocalBrand Egypt. By accessing or using our marketplace, you agree to be bound by these Terms of Service and all applicable Egyptian laws and regulations.

**1. Acceptance of Terms**
By creating an account or making a purchase on LocalBrand, you agree to these terms and our Privacy Policy.

**2. User Accounts**
You are responsible for maintaining the security of your account. You may not share your credentials or register multiple accounts.

**3. Prohibited Activities**
Users may not list counterfeit goods, engage in price manipulation, or misrepresent product descriptions.

**4. Dispute Resolution**
All disputes between buyers and sellers shall be mediated by LocalBrand. Our decision is final and binding per Egyptian Commercial Law.

**5. Governing Law**
These terms are governed by the laws of the Arab Republic of Egypt.`
  },
  {
    title: 'Privacy Policy',
    id: 'privacy',
    content: `LocalBrand Egypt is committed to protecting your personal data in compliance with Egypt's Personal Data Protection Law (Law No. 151 of 2020).

**Data We Collect**
- Account information (name, email, phone)
- Order and transaction history
- Delivery addresses
- Browsing behavior on our platform

**How We Use Your Data**
- To process orders and payments
- To communicate order updates
- To personalize your shopping experience

**Your Rights**
You have the right to access, correct, and delete your personal data. Use our Data Export feature in Account Settings.

**Data Retention**
Order data is retained for 7 years per Egyptian tax law. Personal data is anonymized upon account deletion.`
  },
  {
    title: 'Return Policy',
    id: 'returns',
    content: `**14-Day Return Window**
All items may be returned within 14 days of delivery for a full refund, provided they are in original condition with all tags attached.

**Non-Returnable Items**
Customized, personalized, or hygiene-sensitive products are not eligible for returns.

**Return Process**
1. Go to your Order History
2. Select the item and click "Request Return"
3. Upload photos of the item
4. Ship the item via any courier
5. Refund processed within 5-7 business days of seller confirmation

**Refund Method**
Refunds are returned to the original payment method or credited to your LocalBrand wallet.`
  },
  {
    title: 'Seller Agreement',
    id: 'seller-agreement',
    content: `**Seller Obligations**
By becoming a LocalBrand seller, you agree to:
- List only authentic, accurately described products
- Fulfill orders within 2 business days of confirmation
- Accept returns per LocalBrand's return policy
- Maintain a seller rating above 3.5 stars

**Commission Structure**
LocalBrand charges a 15% commission on every successful sale. Payouts are processed 7-14 days post-delivery.

**Prohibited Listings**
Counterfeit goods, hazardous materials, and items banned under Egyptian law are strictly prohibited.

**Account Suspension**
LocalBrand reserves the right to suspend seller accounts for policy violations, poor performance metrics, or fraudulent activity.

**Tax Obligations**
Sellers are responsible for declaring income and paying applicable taxes under Egyptian tax law.`
  }
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Legal</h1>
        <p className="text-gray-500 mb-10">LocalBrand Egypt — Legal documents governing our marketplace.</p>

        {/* Quick Nav */}
        <div className="flex flex-wrap gap-3 mb-12">
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="px-4 py-2 rounded-xl bg-white border border-[#e8dfd1] text-sm font-semibold text-gray-700 hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors">
              {s.title}
            </a>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map(section => (
            <div key={section.id} id={section.id} className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">{section.title}</h2>
              <div className="prose prose-gray max-w-none">
                {section.content.split('\n\n').map((para, i) => (
                  <p key={i} className="text-gray-600 mb-4 leading-relaxed whitespace-pre-line">{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          Last updated: April 2026 — Questions? Contact <a href="mailto:legal@localbrand.eg" className="text-[hsl(var(--accent))] hover:underline">legal@localbrand.eg</a>
        </div>
      </div>
    </div>
  );
}
