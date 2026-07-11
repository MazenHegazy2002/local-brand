import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';
import SellClient from './SellClient';

export const metadata: Metadata = {
  title: 'Become an Affiliate | Earn Commission on Brandy',
  description:
    'Join the Brandy affiliate program — share your unique promo code, earn up to 12% commission on every sale, and unlock bonuses for new affiliates you refer.',
  openGraph: {
    title: 'Become an Affiliate | Earn Commission on Brandy',
    description:
      "Join Brandy's affiliate program and earn cash on every sale. Share your code, build your audience, and grow your income — free to apply.",
    url: `${PLATFORM_URL}/sell`,
    type: 'website',
  },
};

export default function SellPage() {
  return <SellClient />;
}
