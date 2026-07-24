import { redirect } from 'next/navigation';

export default function DashboardWalletPage() {
  redirect('/dashboard?tab=wallet');
}
