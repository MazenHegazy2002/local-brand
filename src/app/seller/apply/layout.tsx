import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Seller | Brandy',
  description:
    'Apply to open your store on Brandy and start selling to thousands of buyers across Egypt.',
};

export default function SellerApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
