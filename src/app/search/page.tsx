import type { Metadata } from 'next';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'Search Results',
  description:
    'Search thousands of products from verified Egyptian local sellers on Brandy. Find fashion, electronics, home goods, and more.',
  robots: {
    index: false, // search result pages should not be indexed
    follow: true,
  },
};

export default function SearchPage() {
  return <SearchClient />;
}
