'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui';
import type { ProductQA } from '@/types';
import type { SessionUser } from '@/types';

import Link from 'next/link';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3605) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function QASection({
  productId,
  initialQuestions = [],
}: {
  productId: string;
  initialQuestions: ProductQA[];
}) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const role = user?.role;
  const isSeller = role === 'SELLER';
  const isAdmin = role === 'ADMIN';

  const [questions, setQuestions] = useState<ProductQA[]>(initialQuestions);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const { toast } = useToast();

  // ── Ask a question ───────────────────────────────────────────────────────
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast({ title: 'Please log in to ask a question', variant: 'error' });
      return;
    }
    if (!newQuestion.trim()) {
      toast({ title: 'Question cannot be empty', variant: 'error' });
      return;
    }
    if (newQuestion.trim().length < 5) {
      toast({ title: 'Question must be at least 5 characters', variant: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(prev => [
          {
            ...data.qa,
            user: { name: session.user?.name || 'You' },
          } as ProductQA,
          ...prev,
        ]);
        setNewQuestion('');
        toast({ title: 'Question submitted! The seller will answer soon.', variant: 'success' });
      } else {
        toast({ title: data.message || 'Failed to submit question', variant: 'error' });
      }
    } catch {
      toast({ title: 'Failed to submit question', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Post an answer (seller/admin) ────────────────────────────────────────
  const handlePostAnswer = async (qaId: string) => {
    const answer = answerDraft[qaId];
    if (!answer?.trim()) {
      toast({ title: 'Please write an answer before submitting', variant: 'error' });
      return;
    }

    setSubmittingAnswer(true);
    try {
      const res = await fetch(`/api/products/${productId}/qa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaId, answer: answer.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(prev =>
          prev.map(q =>
            q.id === qaId
              ? {
                  ...q,
                  answer: answer.trim(),
                  answeredAt: new Date(),
                }
              : q
          )
        );
        setAnsweringId(null);
        setAnswerDraft(d => ({ ...d, [qaId]: '' }));
        toast({ title: 'Answer posted!', variant: 'success' });
      } else {
        toast({ title: data.message || 'Failed to post answer', variant: 'error' });
      }
    } catch {
      toast({ title: 'Failed to post answer', variant: 'error' });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const canAnswer = isSeller || isAdmin;

  return (
    <div className="mt-12 bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900">Product Q&amp;A</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {questions.length === 0
              ? 'No questions yet — be the first to ask!'
              : `${questions.length} question${questions.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {/* Stats pill */}
        {questions.filter(q => q.answer).length > 0 && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {questions.filter(q => q.answer).length} answered
          </span>
        )}
      </div>

      {/* Ask a question form */}
      {!canAnswer &&
        (session ? (
          <form
            onSubmit={handleAskQuestion}
            className="mb-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100"
          >
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">💬</span> Ask a Question
            </h4>
            <textarea
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder="What would you like to know about this product?"
              rows={3}
              className="w-full text-sm border border-blue-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-400 text-gray-800 mb-3"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{newQuestion.length}/500</span>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  'Submit Question'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-10 bg-gray-50 rounded-2xl p-6 text-center border border-gray-150 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-gray-650 font-bold mb-3 text-sm">
              Have a question about this product?
            </p>
            <Link
              href={`/login?callbackUrl=${typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : ''}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
            >
              Log in to ask a question
            </Link>
          </div>
        ))}

      {/* Questions list */}
      <div className="space-y-6">
        {questions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🙋</div>
            <p className="font-semibold text-gray-600">No questions yet</p>
            <p className="text-sm mt-1">Be the first to ask about this product</p>
          </div>
        )}

        {questions.map(q => (
          <div
            key={q.id}
            className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
          >
            {/* Question row */}
            <div className="flex items-start gap-3 p-4 bg-gray-50">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-xs font-black shrink-0">
                {(q.user?.name ?? 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-gray-700 truncate">
                    {q.user?.name || 'Customer'}
                  </span>
                  <span className="text-[10px] text-gray-400">{timeAgo(q.createdAt)}</span>
                  {!q.answer && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      Awaiting answer
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  <span className="font-bold text-[hsl(var(--primary))] mr-1">Q.</span>
                  {q.question}
                </p>
              </div>
            </div>

            {/* Answer row */}
            {q.answer ? (
              <div className="flex items-start gap-3 p-4 border-t border-gray-100 bg-emerald-50/40">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3l3 3 3-3h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-emerald-700">Seller</span>
                    {q.answeredAt && (
                      <span className="text-[10px] text-gray-400">{timeAgo(q.answeredAt)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-bold text-emerald-600 mr-1">A.</span>
                    {q.answer}
                  </p>
                </div>
              </div>
            ) : canAnswer ? (
              /* Seller answer input */
              <div className="p-4 border-t border-gray-100 bg-emerald-50/20">
                {answeringId === q.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={answerDraft[q.id] || ''}
                      onChange={e => setAnswerDraft(d => ({ ...d, [q.id]: e.target.value }))}
                      placeholder="Write your answer…"
                      rows={2}
                      className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setAnsweringId(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePostAnswer(q.id)}
                        disabled={submittingAnswer}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {submittingAnswer ? 'Posting…' : 'Post Answer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAnsweringId(q.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Answer this question
                  </button>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
