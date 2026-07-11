'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const SOCIAL_PROVIDERS = ['google'] as const;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'This email is already registered with a different sign-in method. Please sign in with your password instead.',
  OAuthCallback: "We couldn't complete sign-in with that provider. Please try again.",
  OAuthSignin: 'There was a problem starting sign-in with that provider.',
  OAuthCreateAccount:
    "We couldn't create your account from this provider. Try using email instead.",
  EmailCreateAccount: "We couldn't create your account with this email. Please try again.",
  Callback: 'There was a problem during authentication. Please try again.',
  EmailSignin: 'Failed to send the sign-in email. Please try again later.',
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'You must sign in to access this page.',
  AccessDenied: 'Access denied. Your account may not have permission.',
  Default: 'Authentication failed. Please try again.',
};

function LoginForm() {
  const _router = useRouter();
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
    urlError ? OAUTH_ERROR_MESSAGES[urlError] || OAUTH_ERROR_MESSAGES.Default : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Magic-link state — when toggled on, the password field is hidden and we
  // POST to /api/auth/magic-link instead of authenticating with credentials.
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter the email you used at checkout.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Failed to send the sign-in link.');
        return;
      }
      setMagicLinkSent(true);
    } catch {
      setError('Failed to send the sign-in link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

    let res;
    try {
      res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
    } catch (_networkErr) {
      setError('Unable to connect. Please check your internet connection and try again.');
      setIsLoading(false);
      return;
    }

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
          else if (role === 'BUYER') {
            // Check if this buyer is also an active affiliate
            try {
              const affRes = await fetch('/api/affiliate/apply');
              if (affRes.ok) {
                const affData = await affRes.json();
                if (affData?.affiliate?.status === 'ACTIVE') {
                  target = '/affiliate/dashboard';
                } else {
                  target = '/dashboard';
                }
              } else {
                target = '/dashboard';
              }
            } catch {
              target = '/dashboard';
            }
          } else {
            target = '/dashboard';
          }
        }

        window.location.href = target;
      } catch (_err) {
        window.location.href = callbackUrl || '/dashboard';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-white to-[hsl(var(--accent)/0.08)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="mx-auto text-center block group">
          <span className="text-4xl font-black tracking-tighter inline-flex items-center gap-1">
            <span className="text-[hsl(var(--primary))]">BRAND</span>
            <span className="text-[hsl(var(--accent))]">Y</span>
          </span>
        </Link>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-[hsl(var(--foreground))]">
          Welcome Back
        </h1>
        <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Sign in to continue your journey
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          {/* Error banner */}
          {error && (
            <div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-200 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          {/* ─── Social OAuth Buttons ────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {SOCIAL_PROVIDERS.map(provider => (
              <button
                key={provider}
                onClick={() => handleSocialSignIn(provider)}
                disabled={loadingProvider === provider}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:shadow-md transition-all shadow-sm text-sm font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {provider === 'google' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span className="capitalize">Continue with {provider}</span>
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

          {/* ─── Magic-link confirmation banner ─────────────────────────────── */}
          {magicLinkSent ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4 text-sm">
              <div className="font-bold mb-1">Check your email</div>
              <p className="leading-relaxed">
                If an account with <strong>{email}</strong> exists, we just sent it a sign-in link.
                The link is good for 30 minutes and works once. After signing in, you&apos;ll be
                asked to set a password so you can use email + password next time.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMagicLinkSent(false);
                  setMagicLinkMode(false);
                }}
                className="mt-3 text-emerald-700 font-medium hover:underline text-xs"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={magicLinkMode ? handleMagicLinkRequest : handleSubmit}
            >
              <div>
                <label htmlFor="email-input" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email-input"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {!magicLinkMode && (
                <div>
                  <label
                    htmlFor="password-input"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm pr-10 transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!magicLinkMode && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))] border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))]"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              )}

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--ring))] disabled:bg-gray-400 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {magicLinkMode ? 'Sending link...' : 'Signing in...'}
                  </span>
                ) : magicLinkMode ? (
                  'Email me a sign-in link'
                ) : (
                  'Sign in'
                )}
              </button>

              {/* Toggle between password / magic-link modes */}
              <button
                type="button"
                onClick={() => {
                  setMagicLinkMode(!magicLinkMode);
                  setError('');
                }}
                className="w-full text-center text-sm text-[hsl(var(--primary))] font-medium hover:underline"
              >
                {magicLinkMode
                  ? '← Sign in with a password instead'
                  : 'No password yet? Email me a sign-in link →'}
              </button>
            </form>
          )}

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))]"
            >
              Create one now
            </Link>
          </p>

          {/* Legal footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in you agree to our{' '}
            <Link href="/legal#terms" className="underline hover:text-gray-600">
              Terms
            </Link>
            {' & '}
            <Link href="/legal#privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
