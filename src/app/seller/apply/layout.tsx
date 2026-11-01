import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Become a Seller | Brandyy',
  description:
    'Apply to open your store on Brandyy and start selling to thousands of buyers across Egypt.',
};

export default function SellerApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
