'use client';

import { useState } from 'react';

interface NewsletterSignupProps {
  variant?: 'inline' | 'card';
  className?: string;
}

export default function NewsletterSignup({ variant = 'card', className = '' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      // In production this hits a Resend contact list or similar provider.
      // For now we store to the Notification feed as a placeholder.
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          title: 'Newsletter Signup',
          message: `Subscribed from marketing widget at ${new Date().toISOString()}`,
        }),
      });
      if (res.ok) {
        setStatus('success');
        setMessage('Thanks! You&rsquo;re on the list.');
        setEmail('');
      } else {
        // Fail soft: don't reveal backend errors to users
        setStatus('success');
        setMessage('Thanks! You&rsquo;re on the list.');
        setEmail('');
      }
    } catch {
      setStatus('error');
      setMessage('Signup failed. Please try again later.');
    }
  };

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2 bg-[#1e3b8a] text-white font-bold rounded-lg hover:bg-[#152c6e] disabled:opacity-50 text-sm"
        >
          {status === 'loading' ? '...' : 'Subscribe'}
        </button>
      </form>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-[#1e3b8a] to-[#0F6E56] rounded-2xl p-8 md:p-10 text-white ${className}`}>
      <div className="max-w-xl mx-auto text-center">
        <h3 className="text-2xl md:text-3xl font-black mb-2">Get deals in your inbox</h3>
        <p className="text-white/80 mb-6 text-sm md:text-base">
          Exclusive offers, Egyptian-made product drops, and flash sales delivered weekly.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:bg-white focus:text-gray-900 outline-none placeholder:text-white/50 transition-colors"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-3 bg-white text-[#1e3b8a] font-bold rounded-xl hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        {message && (
          <p className={`mt-4 text-sm font-medium ${status === 'error' ? 'text-red-200' : 'text-white/90'}`}>
            {message}
          </p>
        )}
        <p className="text-xs text-white/50 mt-4">
          We respect your privacy — unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
