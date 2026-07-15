import type { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your password to regain access to your Brandy account.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
