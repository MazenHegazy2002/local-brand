import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Flash Sales — Limited-Time Deals | Brandy',
  description:
    'Shop limited-time flash sale deals on Brandy. Huge discounts on fashion, electronics, home goods and more from Egyptian local sellers. Hurry — offers expire soon!',
  alternates: {
    canonical: `${PLATFORM_URL}/flash-sales`,
  },
  openGraph: {
    title: 'Flash Sales — Limited-Time Deals | Brandy',
    description:
      'Huge discounts on Egyptian local products. Limited quantities, limited time. Shop now before they sell out!',
    url: `${PLATFORM_URL}/flash-sales`,
    type: 'website',
  },
};

export default function FlashSalesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
