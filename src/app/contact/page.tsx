import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Brandy',
  description: 'Get in touch with Brandy customer support and operations team.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
            Contact Us
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-8">
            {/* Contact Form */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Send us a message</h2>
              <form className="space-y-4">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900"
                    placeholder="Your name"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900"
                    placeholder="yourname@example.com"
                  />
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900"
                    placeholder="How can we help?"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-gray-900"
                    placeholder="Describe your issue or query..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                >
                  Submit Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Support & Inquiries</h2>
                <p className="text-gray-600 leading-relaxed">
                  Have questions about an order, seller terms, or the affiliate program? Our team is
                  here to help. Send us a message or contact us directly via email.
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
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Location
                  </h3>
                  <p className="text-base font-semibold text-gray-700">Cairo, Egypt</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
