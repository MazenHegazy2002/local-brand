import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Portal Sign In | Brandy',
  description:
    'Sign in to the Brandy Seller Hub to manage your store, upload products, and prepare shipments.',
};

export default function SellerLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
