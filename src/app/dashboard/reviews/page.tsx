'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    images: { url: string }[];
  };
}

export default function ReviewsPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', rating: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/reviews');
    }
  }, [status, router]);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const deleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setEditForm({ title: review.title, content: review.content, rating: review.rating });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReview?.id,
          title: editForm.title,
          content: editForm.content,
          rating: editForm.rating,
        }),
      });
      if (res.ok) {
        await fetchReviews();
        setEditingReview(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredReviews =
    filter === 'all'
      ? reviews
      : reviews.filter(r => r.product.title.toLowerCase().includes(filter.toLowerCase()));

  if (loading) {
    return (
      <div className="db">
        <div className="main">Loading...</div>
      </div>
    );
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">
          My<span>LB</span>
        </div>

        <div className="nav-section">Personal</div>
        <Link href="/dashboard" className="nav-item">
          Overview
        </Link>
        <Link href="/dashboard/orders" className="nav-item">
          My Orders
        </Link>
        <Link href="/dashboard/wishlist" className="nav-item">
          Wishlist
        </Link>
        <Link href="/dashboard/notifications" className="nav-item">
          Alerts
        </Link>

        <div className="nav-section">Finance</div>
        <Link href="/dashboard/wallet" className="nav-item">
          Wallet
        </Link>

        <div className="nav-section">System</div>
        <Link href="/dashboard/settings" className="nav-item">
          Settings
        </Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">My reviews</div>
          <span className="text-xs text-slate-500">{reviews.length} reviews</span>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by product..."
            className="input-field max-w-xs"
          />
        </div>

        {reviews.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-5xl mb-4">⭐</div>
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Share your experience with products you&apos;ve purchased
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-[#534AB7] text-white rounded-lg font-medium"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map(review => (
              <div key={review.id} className="card">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-lg overflow-hidden shrink-0">
                    {review.product.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={review.product.images[0].url}
                        alt={review.product.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/product/${review.product.id}`}
                        className="font-medium text-sm hover:text-[#534AB7]"
                      >
                        {review.product.title}
                      </Link>
                      <div className="flex text-yellow-400 text-xs">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{review.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{review.content}</p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openEditModal(review)}
                      className="text-xs text-[#534AB7] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingReview && (
        <div className="modal-overlay" onClick={() => setEditingReview(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="card-title mb-6">Edit Review</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, rating: star })}
                      className={`text-2xl ${star <= editForm.rating ? 'text-yellow-400' : 'text-slate-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-500 mb-1">Review</label>
                <textarea
                  value={editForm.content}
                  onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                  className="input-field"
                  rows={4}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="flex-1 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-[#534AB7] text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .db {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }
        .sidebar {
          width: 186px;
          flex-shrink: 0;
          background: #1a1a2e;
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          max-height: 100vh;
          overflow-y: auto;
          position: sticky;
          top: 0;
          align-self: flex-start;
        }
        .logo {
          padding: 0 16px 20px;
          font-size: 15px;
          font-weight: 500;
          color: #fff;
        }
        .logo span {
          color: #7f77dd;
        }
        .nav-section {
          font-size: 10px;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.08em;
          padding: 10px 16px 4px;
          text-transform: uppercase;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          color: #888;
          transition: all 0.12s;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ccc;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 18px;
          overflow: auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: #1e293b;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 16px;
        }
        .input-field {
          width: 100%;
          border: 1px solid #e2e8f0;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
        }
        .input-field:focus {
          border-color: #534ab7;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          width: 100%;
          max-width: 500px;
          padding: 32px;
          border-radius: 16px;
        }
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
