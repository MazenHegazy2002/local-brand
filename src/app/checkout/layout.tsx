import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | Brandyy',
  description: 'Complete your purchase securely on Brandyy.',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
