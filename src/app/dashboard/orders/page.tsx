import { redirect } from 'next/navigation';

export default function DashboardOrdersPage() {
  redirect('/dashboard?tab=orders');
}
