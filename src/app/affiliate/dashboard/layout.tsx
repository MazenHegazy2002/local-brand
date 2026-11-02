import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Affiliate Portal', template: '%s | Brandyy' },
  robots: { index: false, follow: false },
};

export default function AffiliateDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
