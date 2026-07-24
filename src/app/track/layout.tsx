import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Your Order | Brandy',
  description: 'Track the real-time status of your Brandy order with your order ID and email.',
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
