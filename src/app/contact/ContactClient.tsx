'use client';

import { useState } from 'react';
import { SUPPORT_EMAIL, CONTACT_PHONE, CONTACT_WHATSAPP } from '@/lib/constants';

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
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-base font-bold text-blue-600 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          {CONTACT_PHONE && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Phone Support
              </h3>
              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {CONTACT_PHONE}
              </a>
            </div>
          )}

          {CONTACT_WHATSAPP && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                WhatsApp Support
              </h3>
              <a
                href={`https://wa.me/${CONTACT_WHATSAPP.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.926 0-3.725-.517-5.285-1.416l-.379-.221-3.928 1.03 1.048-3.829-.247-.394A9.85 9.85 0 0 1 2.038 12c0-5.452 4.436-9.889 9.889-9.889 2.64 0 5.12 1.03 6.988 2.898a9.825 9.825 0 0 1 2.895 6.99c0 5.452-4.437 9.89-9.889 9.89m0-21.78C5.455.063.063 5.455.063 12c0 2.1.547 4.148 1.587 5.952L0 24l6.191-1.624C7.904 23.36 9.917 24 12.051 24c6.545 0 11.937-5.393 11.937-11.937 0-3.189-1.242-6.188-3.497-8.444C18.238 1.363 15.24.063 12.051.063" />
                </svg>
                Chat on WhatsApp ({CONTACT_WHATSAPP})
              </a>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</h3>
            <p className="text-base font-semibold text-gray-700">Cairo, Egypt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
