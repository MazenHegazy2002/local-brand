'use client';
import { useLanguage } from '@/providers/LanguageContext';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SocialSignIn from '@/components/SocialSignIn';
import { Suspense } from 'react';

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
  const { tr } = useLanguage();
  const _router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const urlError = searchParams.get('error');

  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/auth/captcha');
      if (res.ok) {
        const data = await res.json();
        setCaptchaId(data.captchaId);
        setCaptchaQuestion(data.question);
        setCaptchaAnswer('');
      }
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    }
  };

  const isLockedOut = lockoutSeconds > 0;
  useEffect(() => {
    if (failedAttempts >= 3 || lockoutSeconds > 0) {
      fetchCaptcha();
    }
  }, [failedAttempts, isLockedOut, lockoutSeconds]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setError('');
          return 0;
        }
        setError(
          `Too many failed login attempts. Your account has been temporarily locked. Please try again in ${Math.floor(
            next / 60
          )}m ${next % 60}s.`
        );
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

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
  const [showPassword, setShowPassword] = useState(false);

  // Magic-link state — when toggled on, the password field is hidden and we
  // POST to /api/auth/magic-link instead of authenticating with credentials.
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(tr('Please enter the email you used at checkout.'));
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
        setError(data?.message || tr('Failed to send the sign-in link.'));
        return;
      }
      setMagicLinkSent(true);
    } catch {
      setError(tr('Failed to send the sign-in link. Please try again.'));
    } finally {
      setIsLoading(false);
    }
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
        captchaId: failedAttempts >= 3 || lockoutSeconds > 0 ? captchaId : undefined,
        captchaAnswer: failedAttempts >= 3 || lockoutSeconds > 0 ? captchaAnswer : undefined,
      });
    } catch (_networkErr) {
      setError(tr('Unable to connect. Please check your internet connection and try again.'));
      setIsLoading(false);
      return;
    }

    if (res?.error) {
      setFailedAttempts(prev => prev + 1);
      if (res.error.startsWith('LOCKOUT:')) {
        const parts = res.error.split(':');
        const secs = parseInt(parts[2]) || 300;
        setLockoutSeconds(secs);
        setError(
          `Too many failed login attempts. Your account has been temporarily locked. Enter the security code above or try again in ${Math.floor(
            secs / 60
          )}m ${secs % 60}s.`
        );
        fetchCaptcha();
      } else if (res.error.toLowerCase().includes('email not verified')) {
        setError(tr('Please verify your email address before logging in.'));
      } else {
        setError(tr('Invalid email or password'));
        if (failedAttempts + 1 >= 3) {
          fetchCaptcha();
        }
      }
      setIsLoading(false);
    } else {
      setFailedAttempts(0);
      setLockoutSeconds(0);
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;

        let target = callbackUrl;
        // Prevent open-redirect: only allow internal relative paths
        if (!target.startsWith('/') || target.startsWith('//') || target.includes('://')) {
          target = '/dashboard';
        }
        if (!target || target === '/dashboard') {
          if (role === 'ADMIN' || role === 'CO_ADMIN') target = '/admin-os';
          else if (role === 'SELLER') target = '/seller-hub';
          else if (role === 'AFFILIATE') target = '/affiliate/dashboard';
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
          {tr('Welcome Back')}
        </h1>
        <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {tr('Sign in to continue your journey')}
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
          <SocialSignIn callbackUrl={callbackUrl} />

          {/* ─── Divider ─────────────────────────────────────────────────────── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400 font-medium">
                {tr('or sign in with email')}
              </span>
            </div>
          </div>

          {/* ─── Magic-link confirmation banner ─────────────────────────────── */}
          {magicLinkSent ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4 text-sm">
              <div className="font-bold mb-1">{tr('Check your email')}</div>
              <p className="leading-relaxed">
                {tr('If an account with')} <strong>{email}</strong>{' '}
                {tr(
                  "exists, we just sent it a sign-in link. The link is good for 30 minutes and works once. After signing in, you'll be asked to set a password so you can use email + password next time."
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMagicLinkSent(false);
                  setMagicLinkMode(false);
                }}
                className="mt-3 text-emerald-700 font-medium hover:underline text-xs"
              >
                {tr('Use a different email')}
              </button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={magicLinkMode ? handleMagicLinkRequest : handleSubmit}
            >
              <div>
                <label htmlFor="email-input" className="block text-sm font-medium text-gray-700">
                  {tr('Email address')}
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
                    {tr('Password')}
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-[hsl(var(--primary))] sm:text-sm pe-10 transition-all"
                      placeholder={tr('Enter your password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

              {/* CAPTCHA math security verification */}
              {!magicLinkMode && (failedAttempts >= 3 || lockoutSeconds > 0) && captchaQuestion && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-orange-800 uppercase tracking-wider">
                    {tr('Security Verification Required')}
                  </div>
                  <div className="text-sm text-gray-700">
                    {tr('Prove you are human to bypass lockout and verify your login attempt:')}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-sm font-mono text-gray-800">
                      {captchaQuestion}
                    </span>
                    <input
                      type="text"
                      required
                      value={captchaAnswer}
                      onChange={e => setCaptchaAnswer(e.target.value)}
                      placeholder={tr('Answer')}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center font-mono focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
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
                    <label htmlFor="remember-me" className="ms-2 block text-sm text-gray-900">
                      {tr('Remember me')}
                    </label>
                  </div>
                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))]"
                    >
                      {tr('Forgot password?')}
                    </Link>
                  </div>
                </div>
              )}

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={
                  isLoading ||
                  ((failedAttempts >= 3 || lockoutSeconds > 0) && !captchaAnswer.trim())
                }
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
                    {magicLinkMode ? tr('Sending link...') : tr('Signing in...')}
                  </span>
                ) : magicLinkMode ? (
                  tr('Email me a sign-in link')
                ) : (
                  tr('Sign in')
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
                  ? tr('← Sign in with a password instead')
                  : tr('No password yet? Email me a sign-in link →')}
              </button>
            </form>
          )}

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            {tr("Don't have an account?")}{' '}
            <Link
              href="/register"
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))]"
            >
              {tr('Create one now')}
            </Link>
          </p>

          {/* Legal footer */}
          <p className="mt-6 text-center text-xs text-gray-400">
            {tr('By signing in you agree to our')}{' '}
            <Link href="/legal#terms" className="underline hover:text-gray-600">
              {tr('Terms')}
            </Link>
            {' & '}
            <Link href="/legal#privacy" className="underline hover:text-gray-600">
              {tr('Privacy Policy')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { tr } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-gray-400">
          {tr('Loading...')}
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
