import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Brandy',
  description: 'Sign in to your Brandy account to manage your profile, orders, and wishlist.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
