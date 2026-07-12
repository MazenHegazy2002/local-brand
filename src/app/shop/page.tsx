import type { Metadata } from 'next';
import ShopPage from './ShopClient';

export const metadata: Metadata = {
  title: 'Shop — All Products',
  description:
    'Browse thousands of products from verified Egyptian local sellers on Brandy. Filter by category, price, brand, and more. Fast delivery across Egypt.',
  openGraph: {
    title: 'Shop — All Products',
    description: 'Browse thousands of products from verified Egyptian local sellers on Brandy.',
    type: 'website',
  },
};

export default function Page() {
  return <ShopPage />;
}
