'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit ticket');
      setTicketId(data.ticketId || '');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-[#f9f8f6]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Ticket submitted!</h1>
            <p className="text-gray-500 mb-4">
              Your ticket ID is{' '}
              <span className="font-mono font-bold text-[#1e3b8a]">#{ticketId}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              We&apos;ll reply to <strong>{form.email}</strong> within 24 hours.
            </p>
            <a href="/" className="inline-block px-6 py-3 bg-[#1e3b8a] text-white rounded-xl font-bold">
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-900 mb-3">Contact Support</h1>
            <p className="text-gray-500">
              Send us a message and we&apos;ll respond within 24 hours.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white"
              >
                <option value="general">General Inquiry</option>
                <option value="order">Order Issue</option>
                <option value="payment">Payment Problem</option>
                <option value="return">Return / Refund</option>
                <option value="seller">Seller Support</option>
                <option value="technical">Technical Issue</option>
                <option value="feedback">Feedback / Suggestion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
              <input
                required
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
              <textarea
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                placeholder="Please describe your issue in detail..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1e3b8a] outline-none resize-none"
                maxLength={2000}
              />
              <div className="text-xs text-gray-400 mt-1 text-right">
                {form.message.length}/2000
              </div>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                Something went wrong submitting your ticket. Please try again or email us directly at{' '}
                <a href="mailto:support@localbrand.com" className="underline">
                  support@localbrand.com
                </a>
                .
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-4 bg-[#1e3b8a] text-white rounded-xl font-black disabled:opacity-50 hover:bg-[#152c6e] transition-colors"
            >
              {status === 'loading' ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="text-2xl mb-2">📧</div>
              <div className="font-bold text-gray-900">Email</div>
              <a href="mailto:support@localbrand.com" className="text-sm text-[#1e3b8a] underline">
                support@localbrand.com
              </a>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="text-2xl mb-2">⏰</div>
              <div className="font-bold text-gray-900">Response Time</div>
              <div className="text-sm text-gray-500">Within 24 hours, Sun-Thu</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
