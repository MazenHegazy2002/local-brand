import Navbar from '@/components/Navbar';
import DeleteAccountClient from './DeleteAccountClient';

// Public page linked from Google Play's Data safety form ("Delete account URL"):
// explains how to delete a Brandyy account and what happens to the data,
// and lets a signed-in user start the deletion right here.
export const metadata = {
  title: 'Delete your account',
  description:
    'How to delete your Brandyy account and personal data, what is deleted, and what is kept for legal reasons.',
  alternates: { canonical: '/delete-account' },
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <DeleteAccountClient />
    </main>
  );
}
