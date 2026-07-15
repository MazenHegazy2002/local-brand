'use client';

import { useState } from 'react';

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setTicketId('');

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit message');
      }

      setTicketId(data.ticketId);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: '',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (ticketId) {
    return (
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-8 text-center max-w-lg mx-auto my-8 shadow-sm animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✓
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Message Sent Successfully!</h2>
        <p className="text-slate-600 text-sm mb-6">
          Thank you for reaching out. We have logged your request under ticket reference:
        </p>
        <div className="inline-block bg-white border border-emerald-200 px-6 py-3 rounded-2xl shadow-sm mb-6 font-mono text-emerald-700 font-bold text-lg tracking-wider">
          #{ticketId}
        </div>
        <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-6">
          A confirmation email has been sent to your address. Our support team will review your
          query and get back to you within 24 hours.
        </p>
        <button
          onClick={() => setTicketId('')}
          className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-8">
      {/* Contact Form */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Send us a message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label
              htmlFor="contact-name"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900 text-sm transition-shadow"
              placeholder="Your name"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900 text-sm transition-shadow"
              placeholder="yourname@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="contact-category"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Inquiry Type
            </label>
            <select
              id="contact-category"
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900 text-sm transition-shadow"
              disabled={loading}
            >
              <option value="general">General Inquiry</option>
              <option value="order">Order Support</option>
              <option value="payment">Payment Issue</option>
              <option value="return">Return or Refund</option>
              <option value="seller">Seller Partnerships</option>
              <option value="technical">Technical Support</option>
              <option value="feedback">Feedback / Suggestion</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900 text-sm transition-shadow"
              placeholder="How can we help?"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              rows={4}
              required
              value={formData.message}
              onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900 text-sm transition-shadow"
              placeholder="Describe your issue or query..."
              disabled={loading}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {loading ? 'Submitting Message...' : 'Submit Message'}
          </button>
        </form>
      </div>

      {/* Contact Information */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Support & Inquiries</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            Have questions about an order, seller terms, or the affiliate program? Our team is here
            to help. Send us a message or contact us directly via email.
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Email Support
            </h3>
            <a
              href="mailto:support@lolozozo.shop"
              className="text-base font-bold text-blue-600 hover:underline"
            >
              support@lolozozo.shop
            </a>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</h3>
            <p className="text-base font-semibold text-gray-700">Cairo, Egypt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
