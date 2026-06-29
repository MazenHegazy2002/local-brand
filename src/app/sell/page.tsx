import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';
import SellClient from './SellClient';

export const metadata: Metadata = {
  title: 'Start Selling on Brandy | Become a Local Brand Seller',
  description:
    "Join Brandy and start selling your products to thousands of Egyptian customers. Apply to become a seller today — it's free to apply, no monthly fees.",
  openGraph: {
    title: 'Start Selling on Brandy | Become a Local Brand Seller',
    description:
      "Apply to sell your products on Brandy — Egypt's marketplace for local sellers. Free to apply, no monthly fees.",
    url: `${PLATFORM_URL}/sell`,
    type: 'website',
  },
};

export default function SellPage() {
  return <SellClient />;
}
