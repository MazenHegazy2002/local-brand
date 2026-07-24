import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SessionUser } from '@/types';

export const metadata: Metadata = {
  title: { default: 'Admin OS', template: '%s | Admin OS' },
  robots: { index: false, follow: false },
};

export default async function AdminOsLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser)?.role !== 'ADMIN') {
      redirect('/login');
    }
  } catch (err: unknown) {
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('[AdminOsLayout] Auth check error:', err);
    redirect('/login');
  }

  return <>{children}</>;
}
