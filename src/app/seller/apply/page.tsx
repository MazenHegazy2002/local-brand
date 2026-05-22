'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui';
import Link from 'next/link';

export default function SellerApplicationPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/seller/apply');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call for application
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                ✓
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
              <p className="text-gray-600 mb-8 text-lg">
                Thank you for applying to become a seller on Brandy. Our team will review your
                application within 2-3 business days. We&apos;ll send an email with the next steps
                once approved.
              </p>
              <Link href="/dashboard">
                <Button className="w-full text-lg h-14">Return to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-gray-900 mb-3">Become a Seller</h1>
                <p className="text-gray-500">
                  Join our marketplace and reach thousands of local customers.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    placeholder="e.g. Cairo Tech Hub"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Type
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="individual">Individual / Freelancer</option>
                    <option value="company">Registered Company</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tax Registration Number (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    placeholder="XXX-XXX-XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    What products will you sell?
                  </label>
                  <textarea
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                    rows={4}
                    placeholder="Describe your product catalog..."
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg">
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                  <p className="text-center text-xs text-gray-500 mt-4">
                    By submitting, you agree to our{' '}
                    <Link href="/legal" className="text-[#1e3b8a] hover:underline">
                      Seller Terms & Conditions
                    </Link>
                    .
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
