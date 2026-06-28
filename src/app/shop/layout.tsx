import type { Metadata } from 'next';
import { PLATFORM_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Shop — Browse All Products',
  description:
    'Shop thousands of products from verified Egyptian local sellers on Brandy. Filter by category, price, rating, and more. Fast delivery across Egypt.',
  alternates: {
    canonical: `${PLATFORM_URL}/shop`,
  },
  openGraph: {
    title: 'Shop All Products | Brandy — Egyptian Marketplace',
    description:
      'Discover authentic Egyptian products from local sellers. Shop fashion, electronics, home goods, beauty and more on Brandy.',
    url: `${PLATFORM_URL}/shop`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Products | Brandy',
    description: 'Discover authentic Egyptian products from local sellers on Brandy.',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
