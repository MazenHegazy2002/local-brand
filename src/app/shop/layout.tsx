import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Shop — Browse All Products',
  description:
    'Shop thousands of products from verified Egyptian local sellers on Brandyy. Filter by category, price, rating, and more. Fast delivery across Egypt.',
  alternates: {
    canonical: `${PLATFORM_URL}/shop`,
  },
  openGraph: {
    title: 'Shop All Products',
    description:
      'Discover authentic Egyptian products from local sellers. Shop fashion, electronics, home goods, beauty and more on Brandyy.',
    url: `${PLATFORM_URL}/shop`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Products',
    description: 'Discover authentic Egyptian products from local sellers on Brandyy.',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
