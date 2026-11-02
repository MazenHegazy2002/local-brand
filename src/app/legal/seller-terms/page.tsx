import { getServerTr } from '@/lib/i18n/server';
import LegalPageLoader from '../_components/LegalPageLoader';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Seller Terms & Conditions',
  description: 'Terms and conditions for sellers on Brandyy marketplace',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

async function StaticContent() {
  const tr = await getServerTr();
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-black text-gray-900 mb-2">
          {tr('Seller Terms & Conditions')}
        </h1>
        <p className="text-sm text-gray-400 mb-10">{tr('Last updated: January 2026')}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <Section title={tr('1. Acceptance of Terms')}>
            <p>
              {tr(
                'By registering as a seller on Brandyy ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the Platform as a seller.'
              )}
            </p>
          </Section>

          <Section title={tr('2. Eligibility')}>
            <p>{tr('To sell on the Platform you must:')}</p>
            <ul className="list-disc ms-6 space-y-1">
              <li>
                {tr('Be at least 18 years of age and a resident of the Arab Republic of Egypt;')}
              </li>
              <li>{tr('Have a valid Egyptian tax registration number if required by law;')}</li>
              <li>{tr('Provide accurate and complete information during registration;')}</li>
              <li>{tr('Maintain an active Egyptian bank account for payouts.')}</li>
            </ul>
          </Section>

          <Section title={tr('3. Commission & Fees')}>
            <p>
              {tr('The Platform retains a commission of')} <strong>15%</strong>{' '}
              {tr('on each sale. VAT of')} <strong>14%</strong>{' '}
              {tr(
                'is added on top of the item price and collected from the buyer in accordance with Egyptian tax law.'
              )}
            </p>
            <p>
              {tr(
                'Shipping fees are charged separately and are set by the Platform based on governorate.'
              )}
            </p>
          </Section>

          <Section title={tr('4. Payouts')}>
            <p>
              {tr('Funds from completed orders are held in escrow for')}{' '}
              <strong>{tr('14 days')}</strong>{' '}
              {tr(
                'after delivery. After this period, funds become part of your seller balance and can be withdrawn via the Seller Hub wallet.'
              )}
            </p>
            <p>
              {tr(
                'Withdrawal requests are processed within 3-5 business days to your registered Egyptian bank account. Minimum withdrawal is 100 EGP.'
              )}
            </p>
          </Section>

          <Section title={tr('5. Product Listings')}>
            <p>
              {tr(
                'Sellers are solely responsible for the accuracy of product listings. Listings must:'
              )}
            </p>
            <ul className="list-disc ms-6 space-y-1">
              <li>
                {tr(
                  'Accurately describe the product, including condition, dimensions, and materials;'
                )}
              </li>
              <li>
                {tr('Not infringe any trademark, copyright, or other intellectual property;')}
              </li>
              <li>
                {tr(
                  'Comply with all applicable laws, including the Consumer Protection Law of Egypt;'
                )}
              </li>
              <li>
                {tr(
                  'Not contain prohibited items (e.g. counterfeits, weapons, controlled substances).'
                )}
              </li>
            </ul>
          </Section>

          <Section title={tr('6. Order Fulfillment')}>
            <p>
              {tr('Sellers must ship orders within')} <strong>{tr('2 business days')}</strong>{' '}
              {tr(
                'of confirmation unless otherwise specified. Failure to fulfill orders may result in order cancellation, buyer refund, and impact on seller performance metrics.'
              )}
            </p>
          </Section>

          <Section title={tr('7. Returns & Refunds')}>
            <p>
              {tr('Buyers may request returns within')} <strong>{tr('14 days')}</strong>{' '}
              {tr(
                'of delivery. Sellers are required to accept valid return requests for defective, damaged, or misrepresented items. For change-of-mind returns, the seller may set their own policy as long as it is clearly disclosed in the listing.'
              )}
            </p>
          </Section>

          <Section title={tr('8. Seller Performance')}>
            <p>
              {tr(
                "Sellers are evaluated on key performance indicators: order acceptance rate, shipping speed, and return rate. Consistently poor performance may result in account suspension or termination at the Platform's discretion."
              )}
            </p>
          </Section>

          <Section title={tr('9. Intellectual Property')}>
            <p>
              {tr(
                'Sellers grant the Platform a non-exclusive, royalty-free license to use product images, descriptions, and seller trademarks for the purpose of promoting and displaying the products within the Platform and its marketing channels.'
              )}
            </p>
          </Section>

          <Section title={tr('10. Termination')}>
            <p>
              {tr(
                "The Platform reserves the right to suspend or terminate seller accounts for violations of these terms, illegal activity, or at the Platform's sole discretion. Upon termination, pending withdrawals will be processed after clearing any outstanding return or dispute windows."
              )}
            </p>
          </Section>

          <Section title={tr('11. Governing Law')}>
            <p>
              {tr(
                'These Terms are governed by the laws of the Arab Republic of Egypt. Any disputes shall be resolved in the competent courts of Cairo.'
              )}
            </p>
          </Section>

          <Section title={tr('12. Contact')}>
            <p>
              {tr('Questions about these Terms can be directed to')}{' '}
              <a href="mailto:sellers@brandy.com" className="text-[#1e3b8a] underline">
                sellers@brandy.com
              </a>
              .
            </p>
          </Section>
        </div>
      </article>
    </main>
  );
}

export default function SellerTermsPage() {
  return (
    <LegalPageLoader
      dbSlug="legal-seller-terms"
      staticTitle="Seller Terms & Conditions"
      staticContent={<StaticContent />}
    />
  );
}
