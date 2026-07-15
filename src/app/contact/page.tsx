import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Brandy customer support and operations team.',
};

import ContactClient from './ContactClient';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
            Contact Us
          </h1>
          <ContactClient />
        </div>
      </div>
    </main>
  );
}
