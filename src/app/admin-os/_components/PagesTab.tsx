'use client';

// Pages CMS tab — what powers /p/about, /p/faq, /p/terms, etc.
//
// Two columns: left = list of all pages with status badges, right = the
// editor pane (or empty state when nothing is selected).
//
// The editor is intentionally simple: title, slug, status select, body
// textareas (Arabic + English), SEO meta. Markdown renders publicly via
// the `parseMarkdown` sanitizer in lib/sanitize.ts — same path used by
// product descriptions.

import React, { useEffect, useMemo, useState } from 'react';

interface PageRow {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string | null;
  bodyEn: string;
  bodyAr: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  footerOrder: number;
  navOrder: number;
  updatedAt: string;
}

const EMPTY_DRAFT: Partial<PageRow> = {
  slug: '',
  titleEn: '',
  titleAr: '',
  bodyEn: '',
  bodyAr: '',
  seoTitle: '',
  seoDescription: '',
  ogImageUrl: '',
  status: 'DRAFT',
  footerOrder: 0,
  navOrder: 0,
};

export default function PagesTab() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Partial<PageRow>>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pages');
      const json = await res.json();
      setPages(json.pages || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    return filter === 'all' ? pages : pages.filter(p => p.status === filter);
  }, [pages, filter]);

  const open = (id: string) => {
    const p = pages.find(x => x.id === id);
    if (!p) return;
    setDraft(p);
    setActiveId(id);
    setErr(null);
  };

  const newPage = () => {
    setDraft({ ...EMPTY_DRAFT });
    setActiveId('new');
    setErr(null);
  };

  const close = () => {
    setActiveId(null);
    setDraft(EMPTY_DRAFT);
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const isCreate = activeId === 'new';
      const res = await fetch('/api/admin/pages', {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isCreate ? draft : { ...draft, id: activeId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Save failed');
      await load();
      // Stay on the page we just created/edited; pick the returned id.
      if (j.page) {
        setActiveId(j.page.id);
        setDraft(j.page);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!activeId || activeId === 'new') return;
    if (!confirm('Archive this page? It will become inaccessible at /p/<slug>.')) return;
    try {
      const res = await fetch(`/api/admin/pages?id=${activeId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Archive failed');
      }
      await load();
      close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 text-sm">Loading pages…</div>;

  return (
    <div className="pages-shell">
      <div className="pages-grid">
        {/* Left: list */}
        <aside className="pages-list">
          <div className="pages-list-head">
            <button onClick={newPage} className="pages-new-btn">
              + New page
            </button>
          </div>
          <div className="pages-list-filter">
            {(['all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`pages-filter-pill ${filter === s ? 'is-active' : ''}`}
              >
                {s.toLowerCase()}
              </button>
            ))}
          </div>
          <ul className="pages-list-items">
            {visible.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-slate-400">No pages yet</li>
            )}
            {visible.map(p => (
              <li key={p.id}>
                <button
                  onClick={() => open(p.id)}
                  className={`pages-list-item ${activeId === p.id ? 'is-active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="pages-list-title">{p.titleEn}</span>
                  </div>
                  <code className="pages-list-slug">/p/{p.slug}</code>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right: editor */}
        <main className="pages-editor">
          {!activeId && (
            <div className="pages-empty">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="text-base font-semibold mb-1">Select a page or create a new one</h3>
              <p className="text-sm text-slate-500">
                CMS pages are addressable at <code>/p/&lt;slug&gt;</code> — perfect for About, FAQ,
                Terms, etc.
              </p>
            </div>
          )}
          {activeId && (
            <>
              {err && <div className="pages-err">{err}</div>}

              <div className="pages-editor-head">
                <h2 className="pages-editor-title">
                  {activeId === 'new' ? 'New page' : draft.titleEn}
                </h2>
                <div className="flex gap-2">
                  {activeId !== 'new' && (
                    <button onClick={archive} className="pages-archive">
                      Archive
                    </button>
                  )}
                  <button onClick={close} className="pages-cancel">
                    Cancel
                  </button>
                  <button onClick={save} className="pages-save" disabled={saving}>
                    {saving ? 'Saving…' : activeId === 'new' ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="pages-fields">
                <Field label="Slug (URL)" required>
                  <input
                    className="pages-input"
                    value={draft.slug ?? ''}
                    placeholder="about, faq, terms"
                    onChange={e => setDraft({ ...draft, slug: e.target.value })}
                  />
                  {draft.slug && <code className="pages-slug-hint">→ /p/{draft.slug}</code>}
                </Field>

                <Field label="Status">
                  <select
                    className="pages-input"
                    value={draft.status ?? 'DRAFT'}
                    onChange={e =>
                      setDraft({ ...draft, status: e.target.value as PageRow['status'] })
                    }
                  >
                    <option value="DRAFT">Draft (not visible)</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </Field>

                <Field label="Title (English)" required>
                  <input
                    className="pages-input"
                    value={draft.titleEn ?? ''}
                    onChange={e => setDraft({ ...draft, titleEn: e.target.value })}
                  />
                </Field>

                <Field label="Title (Arabic)">
                  <input
                    className="pages-input"
                    value={draft.titleAr ?? ''}
                    dir="rtl"
                    onChange={e => setDraft({ ...draft, titleAr: e.target.value })}
                  />
                </Field>

                <Field label="Body (English, Markdown)" required full>
                  <textarea
                    className="pages-input pages-textarea"
                    value={draft.bodyEn ?? ''}
                    onChange={e => setDraft({ ...draft, bodyEn: e.target.value })}
                    rows={14}
                    placeholder={'# About us\n\nWelcome to ...'}
                  />
                </Field>

                <Field label="Body (Arabic, Markdown)" full>
                  <textarea
                    className="pages-input pages-textarea"
                    value={draft.bodyAr ?? ''}
                    onChange={e => setDraft({ ...draft, bodyAr: e.target.value })}
                    rows={10}
                    dir="rtl"
                  />
                </Field>

                <h3 className="pages-section">SEO</h3>

                <Field label="SEO title">
                  <input
                    className="pages-input"
                    value={draft.seoTitle ?? ''}
                    onChange={e => setDraft({ ...draft, seoTitle: e.target.value })}
                  />
                </Field>

                <Field label="SEO description">
                  <input
                    className="pages-input"
                    value={draft.seoDescription ?? ''}
                    onChange={e => setDraft({ ...draft, seoDescription: e.target.value })}
                  />
                </Field>

                <Field label="OG image URL">
                  <input
                    className="pages-input"
                    type="url"
                    value={draft.ogImageUrl ?? ''}
                    onChange={e => setDraft({ ...draft, ogImageUrl: e.target.value })}
                  />
                </Field>

                <h3 className="pages-section">Placement</h3>

                <Field label="Footer order">
                  <input
                    type="number"
                    className="pages-input"
                    value={draft.footerOrder ?? 0}
                    onChange={e => setDraft({ ...draft, footerOrder: Number(e.target.value) })}
                    min={0}
                  />
                  <span className="pages-hint">0 = not shown in footer; otherwise sort order.</span>
                </Field>

                <Field label="Nav order">
                  <input
                    type="number"
                    className="pages-input"
                    value={draft.navOrder ?? 0}
                    onChange={e => setDraft({ ...draft, navOrder: Number(e.target.value) })}
                    min={0}
                  />
                  <span className="pages-hint">0 = not shown in main nav.</span>
                </Field>
              </div>
            </>
          )}
        </main>
      </div>

      <style jsx>{`
        .pages-shell {
          padding: 0;
        }
        .pages-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 16px;
          align-items: start;
        }
        .pages-list {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 14px 0;
        }
        .pages-list-head {
          padding: 0 16px 12px 16px;
        }
        .pages-new-btn {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          background: #534ab7;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .pages-list-filter {
          display: flex;
          gap: 4px;
          padding: 0 16px 8px 16px;
        }
        .pages-filter-pill {
          flex: 1;
          font-size: 11px;
          padding: 4px 8px;
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          cursor: pointer;
          text-transform: capitalize;
          color: #475569;
        }
        .pages-filter-pill.is-active {
          background: #534ab7;
          color: #fff;
          border-color: #534ab7;
        }
        .pages-list-items {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 60vh;
          overflow: auto;
        }
        .pages-list-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          background: none;
          border: none;
          cursor: pointer;
          border-left: 3px solid transparent;
        }
        .pages-list-item:hover {
          background: #f8fafc;
        }
        .pages-list-item.is-active {
          background: #f5f3ff;
          border-left-color: #534ab7;
        }
        .pages-list-title {
          font-size: 13px;
          color: #1e293b;
        }
        .pages-list-slug {
          font-size: 10px;
          color: #94a3b8;
        }
        .pages-editor {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 24px;
        }
        .pages-empty {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        .pages-err {
          background: #fef2f2;
          color: #b91c1c;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .pages-editor-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .pages-editor-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .pages-archive {
          background: #fef2f2;
          color: #b91c1c;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .pages-cancel {
          background: #f1f5f9;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
        }
        .pages-save {
          background: #534ab7;
          color: #fff;
          border: none;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .pages-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pages-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pages-section {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin: 16px 0 0 0;
        }
        .pages-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .pages-input:focus {
          border-color: #534ab7;
          box-shadow: 0 0 0 3px rgba(83, 74, 183, 0.1);
        }
        .pages-textarea {
          resize: vertical;
          font-family: inherit;
          line-height: 1.6;
        }
        .pages-slug-hint {
          font-size: 11px;
          color: #534ab7;
          margin-top: 4px;
          display: inline-block;
          font-family: ui-monospace, monospace;
        }
        .pages-hint {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: PageRow['status'] }) {
  const styles = {
    DRAFT: { bg: '#f1f5f9', fg: '#64748b' },
    PUBLISHED: { bg: '#d1fae5', fg: '#065f46' },
    ARCHIVED: { bg: '#fef3c7', fg: '#92400e' },
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
