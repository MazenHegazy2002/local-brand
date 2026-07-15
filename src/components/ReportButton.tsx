'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui';

export function ReportButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<
    'INACCURATE' | 'COUNTERFEIT' | 'HARASSMENT' | 'SPAM' | 'OTHER'
  >('INACCURATE');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast({ title: 'Please provide at least 10 characters of explanation.', variant: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, message: message.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Product reported successfully. Our team will review this.',
          variant: 'success',
        });
        setIsOpen(false);
        setMessage('');
      } else {
        toast({ title: data.message || 'Failed to submit report.', variant: 'error' });
      }
    } catch {
      toast({ title: 'An error occurred while submitting the report.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors border border-gray-200 rounded-xl px-3 py-2 bg-white"
        aria-label="Report product"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="text-red-500">🚩</span> Report Product
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Help us keep Brandy authentic and safe. Explain why you think the product listing
                for <strong>"{productName}"</strong> violates our policies.
              </p>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1.5">
                  Reason for reporting
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value as any)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="INACCURATE">Inaccurate description or photos</option>
                  <option value="COUNTERFEIT">Counterfeit or replica item</option>
                  <option value="HARASSMENT">Offensive content or harassment</option>
                  <option value="SPAM">Spam or misleading list</option>
                  <option value="OTHER">Other / Policy violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1.5">
                  Explanation (minimum 10 characters)
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Explain in detail what the issue is..."
                  maxLength={1000}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-gray-800"
                />
                <span className="text-[10px] text-gray-400 block text-right mt-1">
                  {message.length}/1000 characters
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
