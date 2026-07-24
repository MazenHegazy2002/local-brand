import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | Brandy',
  description: 'Complete your purchase securely on Brandy.',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
