import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Seller Hub', template: '%s | Brandy' },
  robots: { index: false, follow: false },
};

export default function SellerHubLayout({ children }: { children: React.ReactNode }) {
  // The seller hub page owns its own flex layout (sticky sidebar + scrollable
  // content). We keep this wrapper transparent so it doesn't introduce an
  // extra scroll container.
  return <>{children}</>;
}
