import { redirect } from 'next/navigation';

// /account is a common bookmarked URL. Redirect to the customer dashboard.
export default function AccountPage() {
  redirect('/dashboard');
}
