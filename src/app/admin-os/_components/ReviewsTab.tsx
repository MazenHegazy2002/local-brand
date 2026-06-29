'use client';

// Reviews & Q&A moderation tab.
//
// One inbox-style table with:
//   • status pills at the top (Pending / Published / Hidden / Rejected)
//   • toggle between Reviews and Q&A
//   • bulk approve / hide / reject actions
//   • inline expansion for the full review/comment text + product link

import React, { useEffect, useState } from 'react';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  flaggedReason: string | null;
  moderationNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; title: string; slug: string };
}

interface QAItem {
  id: string;
  question: string;
  answer: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  flaggedReason: string | null;
  moderationNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; title: string; slug: string };
}

type TabType = 'review' | 'qa';
type StatusFilter = 'all' | 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';

export default function ReviewsTab() {
  const { prompt } = useConfirm();
  const { toast } = useToast();
  const [type, setType] = useState<TabType>('review');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<(ReviewItem | QAItem)[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const json = await res.json();
      setItems(json.items || []);
      setCounts(json.counts || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  const updateOne = async (
    id: string,
    newStatus: 'PUBLISHED' | 'HIDDEN' | 'REJECTED',
    moderationNote?: string
  ) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, status: newStatus, moderationNote }),
      });
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Status Updated',
          description: `Successfully updated item to ${newStatus}.`,
        });
        await load();
      } else {
        toast({
          variant: 'error',
          title: 'Update Failed',
          description: 'Failed to update review status.',
        });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'error', title: 'Error', description: 'Error updating review status.' });
    } finally {
      setBusyId(null);
    }
  };

  const totalPending = (counts.PENDING ?? 0) as number;

  return (
    <div className="rev-shell">
      {/* Header tabs + filters */}
      <div className="rev-head">
        <div className="rev-tabs">
          <button
            onClick={() => setType('review')}
            className={type === 'review' ? 'is-active' : ''}
          >
            Reviews
            {totalPending > 0 && type !== 'review' && (
              <span className="rev-tabs-badge">{totalPending}</span>
            )}
          </button>
          <button onClick={() => setType('qa')} className={type === 'qa' ? 'is-active' : ''}>
            Q&amp;A
          </button>
        </div>
        <div className="rev-search">
          <input
            type="search"
            placeholder={type === 'review' ? 'Search comments…' : 'Search questions…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
      </div>

      {/* Status pills */}
      <div className="rev-pills">
        {(['all', 'PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rev-pill ${status === s ? 'is-active' : ''}`}
          >
            {s === 'all' ? 'All' : s.toLowerCase()}
            <span className="rev-pill-count">
              {s === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[s] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          {status === 'PENDING' ? '🎉 Nothing to moderate' : 'No items match'}
        </div>
      ) : (
        <ul className="rev-list">
          {items.map(item => {
            const isReview = type === 'review';
            const review = item as ReviewItem;
            const qa = item as QAItem;
            const isExpanded = expanded.has(item.id);
            return (
              <li key={item.id} className="rev-row">
                <div className="rev-row-head">
                  <div className="rev-meta">
                    <RowStatusBadge status={item.status} />
                    {isReview && <Stars value={review.rating} />}
                    <span className="rev-author">{item.user.name}</span>
                    <span className="rev-product">
                      on{' '}
                      <a href={`/product/${item.product.slug}`} target="_blank" rel="noreferrer">
                        {item.product.title}
                      </a>
                    </span>
                    <span className="rev-time">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="rev-actions">
                    {item.status !== 'PUBLISHED' && (
                      <button
                        disabled={busyId === item.id}
                        onClick={() => updateOne(item.id, 'PUBLISHED')}
                        className="rev-act rev-act-ok"
                      >
                        Approve
                      </button>
                    )}
                    {item.status !== 'HIDDEN' && (
                      <button
                        disabled={busyId === item.id}
                        onClick={async () => {
                          const note = await prompt({
                            title: 'Hide Item',
                            message: 'Reason for hiding (optional):',
                            placeholder: 'Reason (optional)',
                          });
                          if (note === null) return;
                          updateOne(item.id, 'HIDDEN', note || undefined);
                        }}
                        className="rev-act rev-act-warn"
                      >
                        Hide
                      </button>
                    )}
                    {item.status !== 'REJECTED' && (
                      <button
                        disabled={busyId === item.id}
                        onClick={async () => {
                          const note = await prompt({
                            title: 'Reject Item',
                            message: 'Reason for rejection:',
                            placeholder: 'Reason',
                          });
                          if (!note) return;
                          updateOne(item.id, 'REJECTED', note);
                        }}
                        className="rev-act rev-act-bad"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
                <div
                  className="rev-body"
                  onClick={() =>
                    setExpanded(s => {
                      const next = new Set(s);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                >
                  {isReview ? (
                    <p className={isExpanded ? '' : 'truncate-3'}>
                      {review.comment ?? (
                        <span className="text-slate-400 italic">(no comment)</span>
                      )}
                    </p>
                  ) : (
                    <div>
                      <p className={isExpanded ? '' : 'truncate-2'}>
                        <strong>Q:</strong> {qa.question}
                      </p>
                      {qa.answer && (
                        <p className={`mt-1 ${isExpanded ? '' : 'truncate-2'}`}>
                          <strong>A:</strong> {qa.answer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {item.flaggedReason && <p className="rev-note">⚠️ {item.flaggedReason}</p>}
                {item.moderationNote && (
                  <p className="rev-note rev-note-mod">📝 {item.moderationNote}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .rev-shell {
        }
        .rev-head {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 16px;
        }
        .rev-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #f1f5f9;
          border-radius: 10px;
        }
        .rev-tabs button {
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rev-tabs button.is-active {
          background: #fff;
          color: #534ab7;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .rev-tabs-badge {
          background: #f59e0b;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
        }
        .rev-search {
          flex: 1;
        }
        .rev-search input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .rev-pills {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .rev-pill {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          cursor: pointer;
          color: #475569;
          text-transform: capitalize;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rev-pill.is-active {
          background: #534ab7;
          color: #fff;
          border-color: #534ab7;
        }
        .rev-pill-count {
          background: rgba(255, 255, 255, 0.25);
          padding: 1px 8px;
          border-radius: 999px;
          font-variant-numeric: tabular-nums;
        }
        .rev-pill:not(.is-active) .rev-pill-count {
          background: #f1f5f9;
          color: #64748b;
        }
        .rev-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rev-row {
          padding: 16px 18px;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
        }
        .rev-row-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .rev-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: #64748b;
          flex-wrap: wrap;
        }
        .rev-author {
          font-weight: 600;
          color: #1e293b;
        }
        .rev-product a {
          color: #534ab7;
        }
        .rev-time {
          color: #94a3b8;
        }
        .rev-actions {
          display: flex;
          gap: 6px;
        }
        .rev-act {
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rev-act:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .rev-act-ok {
          background: #d1fae5;
          color: #065f46;
        }
        .rev-act-ok:hover:not(:disabled) {
          background: #a7f3d0;
        }
        .rev-act-warn {
          background: #fef3c7;
          color: #92400e;
        }
        .rev-act-warn:hover:not(:disabled) {
          background: #fde68a;
        }
        .rev-act-bad {
          background: #fee2e2;
          color: #b91c1c;
        }
        .rev-act-bad:hover:not(:disabled) {
          background: #fecaca;
        }
        .rev-body {
          font-size: 13px;
          line-height: 1.6;
          color: #1e293b;
          cursor: pointer;
        }
        .truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .truncate-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .rev-note {
          font-size: 11px;
          color: #b45309;
          margin-top: 8px;
          padding: 6px 10px;
          background: #fffbeb;
          border-left: 3px solid #f59e0b;
          border-radius: 4px;
        }
        .rev-note-mod {
          color: #1e40af;
          background: #eff6ff;
          border-left-color: #3b82f6;
        }
      `}</style>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: 13 }}>
      {'★'.repeat(value)}
      {'☆'.repeat(5 - value)}
    </span>
  );
}

function RowStatusBadge({ status }: { status: ReviewItem['status'] }) {
  const styles = {
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    PUBLISHED: { bg: '#d1fae5', fg: '#065f46' },
    HIDDEN: { bg: '#fee2e2', fg: '#b91c1c' },
    REJECTED: { bg: '#fee2e2', fg: '#b91c1c' },
  };
  const s = styles[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 4,
        letterSpacing: '0.05em',
      }}
    >
      {status}
    </span>
  );
}
