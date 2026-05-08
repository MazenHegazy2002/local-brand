'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const SOCIAL_PROVIDERS = ['google', 'facebook', 'twitter'] as const;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'This email is already registered with a different sign-in method. Please sign in with your password instead.',
  OAuthCallback: 'We couldn\'t complete sign-in with that provider. Please try again.',
  OAuthSignin: 'There was a problem starting sign-in with that provider.',
  OAuthCreateAccount: 'We couldn\'t create your account from this provider. Try using email instead.',
  EmailCreateAccount: 'We couldn\'t create your account with this email. Please try again.',
  Callback: 'There was a problem during authentication. Please try again.',
  EmailSignin: 'Failed to send the sign-in email. Please try again later.',
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'You must sign in to access this page.',
  AccessDenied: 'Access denied. Your account may not have permission.',
  Default: 'Authentication failed. Please try again.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState(() => {
    // Restore "Remember me" email from localStorage
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('local-brand-remember-email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !!localStorage.getItem('local-brand-remember-email');
    } catch {
      return false;
    }
  });
  const [error, setError] = useState(
    urlError ? (OAUTH_ERROR_MESSAGES[urlError] || OAUTH_ERROR_MESSAGES.Default) : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSocialSignIn = async (provider: string) => {
    setLoadingProvider(provider);
    setError('');
    await signIn(provider, { callbackUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Persist email locally if Remember Me is checked
    try {
      if (rememberMe) localStorage.setItem('local-brand-remember-email', email);
      else localStorage.removeItem('local-brand-remember-email');
    } catch {
      // ignore storage errors
    }

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setIsLoading(false);
    } else {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;
        
        let target = callbackUrl;
        if (!target || target === '/dashboard') {
          if (role === 'ADMIN') target = '/admin-os';
          else if (role === 'SELLER') target = '/seller-hub';
          else target = '/dashboard';
        }
        
        window.location.href = target;
      } catch (err) {
        window.location.href = callbackUrl || '/dashboard';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="text-4xl font-black tracking-tighter text-gray-900 mx-auto text-center block">
          LOCAL<span className="text-[#1e3b8a]">BRAND</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to continue your journey
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {/* Error banner */}
          {error && (
            <div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}

          {/* ─── Social OAuth Buttons ────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider}
                onClick={() => handleSocialSignIn(provider)}
                disabled={loadingProvider === provider}
                className="flex items-center justify-center gap-2 py-3 px-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:shadow-md transition-all shadow-sm text-xs font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {provider === 'google' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {provider === 'facebook' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                {provider === 'twitter' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#000000">
                    <path d="M18.244 2.25h3.308l-7.227 8.26h8.238l5.69-6.425L23.39 22H1.17l6.833-7.821L1.35 2.25H8.1l5.903 6.766-2.248 3.176H2.266l6.86-7.835 5.69 6.425V2.25z"/>
                  </svg>
                )}
                <span className="hidden sm:inline capitalize">{provider}</span>
              </button>
            ))}
          </div>

          {/* ─── Divider ─────────────────────────────────────────────────────── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400 font-medium">or sign in with email</span>
            </div>
          </div>

          {/* ─── Credentials Form ─────────────────────────────────────────────── */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-input" className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  id="email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] focus:border-[#1e3b8a] sm:text-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3b8a] focus:border-[#1e3b8a] sm:text-sm pr-10 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#1e3b8a] focus:ring-[#1e3b8a] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label>
              </div>
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-[#1e3b8a] hover:text-blue-800">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              id="signin-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:bg-gray-400 transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>

</form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-[#1e3b8a] hover:text-blue-800">
              Create one now
            </Link>
          </p>

          {/* Legal footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in you agree to our{' '}
            <Link href="/legal#terms" className="underline hover:text-gray-600">Terms</Link>
            {' & '}
            <Link href="/legal#privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-gray-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
