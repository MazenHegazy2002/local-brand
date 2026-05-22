'use client';

import { useState } from 'react';
import { submitReview } from '@/app/actions/seller';
import { useLanguage } from '@/providers/LanguageContext';
import { RatingStars, Button, Textarea, EmptyState, Badge, Avatar } from '@/components/ui';
import type { Review } from '@/types';

export default function ReviewSection({
  productId,
  initialReviews,
}: {
  productId: string;
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
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
      if (res.success && res.review) {
        setReviews([res.review, ...reviews]);
        setComment('');
        setRating(5);
      }
    } catch (_err) {
      alert('Failed to submit review. Make sure you are logged in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100">
      <h3 className="text-2xl font-black text-gray-900 mb-8">{t('CustomerReviews')}</h3>

      <form
        onSubmit={handleSubmit}
        className="mb-12 bg-gray-50 rounded-xl p-6 border border-gray-100"
      >
        <h4 className="font-bold text-gray-900 mb-4">{t('WriteAReview')}</h4>
        <div className="flex gap-2 mb-4">
          <RatingStars value={rating} onChange={setRating} size="lg" />
        </div>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('ShareYourThoughts')}
          rows={4}
          className="mb-4"
        />
        <Button type="submit" loading={submitting}>
          {submitting ? t('Submitting') : t('SubmitReview')}
        </Button>
      </form>

      <div className="space-y-8">
        {reviews.length === 0 && (
          <EmptyState title="No reviews yet" description="Be the first to review this product" />
        )}
        {reviews.map((r: Review) => (
          <div key={r.id} className="border-b border-gray-100 pb-8 last:border-0">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <Avatar fallback={r.user?.name?.substring(0, 1) || 'U'} size="md" />
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    {r.user?.name || 'User'}
                    {r.verifiedPurchase && (
                      <Badge variant="success" size="sm">
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <RatingStars value={r.rating} readOnly size="sm" />
            </div>
            <p className="text-gray-600 text-sm leading-relaxed ml-13">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
