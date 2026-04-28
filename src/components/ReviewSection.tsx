'use client';

import { useState } from 'react';
import { submitReview } from '@/app/actions';
import { useLanguage } from '@/providers/LanguageContext';

export default function ReviewSection({ productId, initialReviews }: { productId: string, initialReviews: any[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await submitReview(productId, rating, comment);
      if (res.success) {
        setReviews([res.review, ...reviews]);
        setComment('');
        setRating(5);
      }
    } catch (err) {
      alert("Failed to submit review. Make sure you are logged in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100">
      <h3 className="text-2xl font-black text-gray-900 mb-8">{t('CustomerReviews')}</h3>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-12 bg-gray-50 rounded-xl p-6 border border-gray-100">
        <h4 className="font-bold text-gray-900 mb-4">{t('WriteAReview')}</h4>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className={`text-2xl ${s <= rating ? 'text-amber-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('ShareYourThoughts')}
          className="w-full h-24 p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#1e3b8a] outline-none text-sm mb-4"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#1e3b8a] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#152c6e] disabled:opacity-50 transition-colors"
        >
          {submitting ? t('Submitting') : t('SubmitReview')}
        </button>
      </form>

      {/* List */}
      <div className="space-y-8">
        {reviews.length === 0 && (
          <p className="text-gray-500 text-center py-8">{t('NoReviewsYet')}</p>
        )}
        {reviews.map((r: any) => (
          <div key={r.id} className="border-b border-gray-100 pb-8 last:border-0">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e3b8a]/10 text-[#1e3b8a] flex items-center justify-center font-bold">
                  {r.user?.name?.substring(0, 1) || 'U'}
                </div>
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    {r.user?.name || 'User'}
                    {r.verifiedPurchase && (
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-200">
                        {t('VerifiedPurchase')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex text-amber-400 text-sm">
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed ml-13">
              {r.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
