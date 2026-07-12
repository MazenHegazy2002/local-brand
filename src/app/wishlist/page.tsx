import { redirect } from 'next/navigation';

// /wishlist is linked from the navbar heart icon in some browsers.
// Redirect to the wishlist tab of the customer dashboard.
export default function WishlistPage() {
  redirect('/dashboard?tab=wishlist');
}
