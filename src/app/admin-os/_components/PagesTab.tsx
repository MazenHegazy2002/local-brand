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
import { useConfirm } from '@/providers/ConfirmProvider';

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
  const { confirm } = useConfirm();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Partial<PageRow>>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('all');

  // Visual Block Builder States
  const [editMode, setEditMode] = useState<'markdown' | 'visual'>('markdown');
  const [enBlocks, setEnBlocks] = useState<any[]>([]);
  const [arBlocks, setArBlocks] = useState<any[]>([]);
  const [visualLang, setVisualLang] = useState<'en' | 'ar'>('en');

  const activeBlocks = visualLang === 'en' ? enBlocks : arBlocks;

  const updateEnBlocks = (newBlocks: any[]) => {
    setEnBlocks(newBlocks);
    setDraft(d => ({ ...d, bodyEn: JSON.stringify(newBlocks) }));
  };

  const updateArBlocks = (newBlocks: any[]) => {
    setArBlocks(newBlocks);
    setDraft(d => ({ ...d, bodyAr: JSON.stringify(newBlocks) }));
  };

  const updateActiveBlocks = visualLang === 'en' ? updateEnBlocks : updateArBlocks;

  // Block Manipulation Event Handlers
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const blocks = [...activeBlocks];
    if (direction === 'up' && index > 0) {
      const temp = blocks[index - 1];
      blocks[index - 1] = blocks[index];
      blocks[index] = temp;
    } else if (direction === 'down' && index < blocks.length - 1) {
      const temp = blocks[index + 1];
      blocks[index + 1] = blocks[index];
      blocks[index] = temp;
    }
    updateActiveBlocks(blocks);
  };

  const removeBlock = (index: number) => {
    const blocks = [...activeBlocks];
    blocks.splice(index, 1);
    updateActiveBlocks(blocks);
  };

  const editBlockField = (index: number, key: string, value: any) => {
    const blocks = [...activeBlocks];
    blocks[index] = { ...blocks[index], [key]: value };
    updateActiveBlocks(blocks);
  };

  const editCardField = (index: number, cardIdx: number, field: string, value: any) => {
    const blocks = [...activeBlocks];
    const items = [...(blocks[index].items || [])];
    while (items.length <= cardIdx) {
      items.push({ emoji: '🌟', title: '', description: '' });
    }
    items[cardIdx] = { ...items[cardIdx], [field]: value };
    blocks[index] = { ...blocks[index], items };
    updateActiveBlocks(blocks);
  };

  const addFaqItem = (index: number) => {
    const blocks = [...activeBlocks];
    const items = [...(blocks[index].items || [])];
    items.push({ question: '', answer: '' });
    blocks[index] = { ...blocks[index], items };
    updateActiveBlocks(blocks);
  };

  const removeFaqItem = (index: number, itemIdx: number) => {
    const blocks = [...activeBlocks];
    const items = [...(blocks[index].items || [])];
    items.splice(itemIdx, 1);
    blocks[index] = { ...blocks[index], items };
    updateActiveBlocks(blocks);
  };

  const editFaqItemField = (index: number, itemIdx: number, field: string, value: any) => {
    const blocks = [...activeBlocks];
    const items = [...(blocks[index].items || [])];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    blocks[index] = { ...blocks[index], items };
    updateActiveBlocks(blocks);
  };

  const addBlockType = (type: string) => {
    const blocks = [...activeBlocks];
    let newBlock: any = { type };
    if (type === 'hero') {
      newBlock = {
        type,
        title: 'New Banner Title',
        description: 'New Description content goes here.',
        bgImage: '',
        btnText: 'Shop Now',
        btnLink: '/shop',
      };
    } else if (type === 'richtext') {
      newBlock = { type, content: '' };
    } else if (type === 'banner') {
      newBlock = { type, emoji: '📢', message: 'Enter alert message text here.' };
    } else if (type === 'productGrid') {
      newBlock = { type, title: 'Explore Categories', categorySlug: '', limit: 4 };
    } else if (type === 'featureGrid') {
      newBlock = {
        type,
        items: [
          {
            emoji: '🇪🇬',
            title: 'Supporting Local Talent',
            description: 'Discover emerging sellers.',
          },
          { emoji: '🛡️', title: 'Verified Quality Brands', description: 'Shop premium quality.' },
          {
            emoji: '🔒',
            title: '14-Day Escrow Guarantee',
            description: 'Secure checkout holding.',
          },
        ],
      };
    } else if (type === 'faq') {
      newBlock = {
        type,
        items: [
          {
            question: 'What is Brandy?',
            answer: "Brandy is Egypt's marketplace for local brands.",
          },
        ],
      };
    }
    blocks.push(newBlock);
    updateActiveBlocks(blocks);
  };

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

  useEffect(() => {
    if (activeId) {
      const enBody = draft.bodyEn || '';
      const arBody = draft.bodyAr || '';

      let parsedEn: any[] = [];
      let parsedAr: any[] = [];
      let isVisual = false;

      if (enBody.trim().startsWith('[')) {
        try {
          parsedEn = JSON.parse(enBody);
          isVisual = true;
        } catch {}
      }
      if (arBody.trim().startsWith('[')) {
        try {
          parsedAr = JSON.parse(arBody);
          isVisual = true;
        } catch {}
      }

      setEnBlocks(parsedEn);
      setArBlocks(parsedAr);
      setEditMode(isVisual ? 'visual' : 'markdown');
    } else {
      setEnBlocks([]);
      setArBlocks([]);
      setEditMode('markdown');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, draft.id]);

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
    const confirmed = await confirm({
      title: 'Archive Page',
      message: 'Archive this page? It will become inaccessible at /p/<slug>.',
      type: 'warning',
    });
    if (!confirmed) return;
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
              <li className="px-4 py-6 text-center text-xs text-slate-400">
                No pages yet — click &ldquo;+ New page&rdquo; to create one.
              </li>
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

          {/* Static / legal pages — these are hardcoded Next.js pages, not CMS-managed.
              Admin can view them here, but to edit their content, update the code files
              under src/app/legal/. */}
          <div className="px-3 pt-4 pb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Static Pages (code-managed)
            </p>
          </div>
          <ul className="pages-list-items">
            {[
              { label: 'Legal Hub', path: '/legal' },
              { label: 'Privacy Policy', path: '/legal/privacy-policy' },
              { label: 'Returns Policy', path: '/legal/returns-refunds' },
              { label: 'Seller Terms', path: '/legal/seller-terms' },
              { label: 'Shipping Policy', path: '/legal/shipping-policy' },
            ].map(pg => (
              <li key={pg.path}>
                <a
                  href={pg.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pages-list-item"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                      static
                    </span>
                    <span className="pages-list-title">{pg.label}</span>
                  </div>
                  <code className="pages-list-slug">{pg.path}</code>
                </a>
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
                    <>
                      {draft.slug && (
                        <a
                          href={`/p/${draft.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pages-cancel"
                          style={{
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          👁️ Preview Page
                        </a>
                      )}
                      <button onClick={archive} className="pages-archive">
                        Archive
                      </button>
                    </>
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

                {/* ── Editor Mode Toggle ── */}
                <div className="col-span-full border-y border-slate-200 py-4 my-2 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Editor Mode</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditMode('markdown')}
                      className={`px-4 py-1.5 rounded-xl font-bold text-xs transition ${
                        editMode === 'markdown'
                          ? 'bg-[#1e3b8a] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Markdown Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode('visual')}
                      className={`px-4 py-1.5 rounded-xl font-bold text-xs transition ${
                        editMode === 'visual'
                          ? 'bg-[#1e3b8a] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Visual Blocks Page Builder (Elementor Mode)
                    </button>
                  </div>
                </div>

                {editMode === 'markdown' ? (
                  <>
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
                  </>
                ) : (
                  <div className="col-span-full">
                    {/* Visual Language Tab Selector */}
                    <div className="flex gap-2 mb-6 border-b border-slate-200 pb-3">
                      <button
                        type="button"
                        onClick={() => setVisualLang('en')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          visualLang === 'en'
                            ? 'bg-[#1e3b8a] text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🇬🇧 Edit English Layout
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualLang('ar')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                          visualLang === 'ar'
                            ? 'bg-[#1e3b8a] text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🇪🇬 Edit Arabic Layout
                      </button>
                    </div>

                    {/* Canvas Blocks */}
                    {activeBlocks.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 bg-slate-50/50 mb-6">
                        <span className="text-3xl block mb-2">🎨</span>
                        <p className="font-bold text-xs">Visual Layout Canvas is Empty</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Add your first layout block below to start building.
                        </p>
                      </div>
                    ) : (
                      <div className="mb-6">
                        {activeBlocks.map((block, index) => (
                          <div
                            key={index}
                            className="border border-slate-200 bg-white rounded-2xl p-6 mb-6 shadow-sm relative group"
                          >
                            {/* Block Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">
                                  {block.type === 'hero'
                                    ? '🖼️'
                                    : block.type === 'richtext'
                                      ? '📝'
                                      : block.type === 'banner'
                                        ? '📢'
                                        : block.type === 'productGrid'
                                          ? '🛒'
                                          : block.type === 'featureGrid'
                                            ? '🌟'
                                            : '❓'}
                                </span>
                                <span className="font-bold text-slate-800 text-sm capitalize">
                                  {block.type === 'productGrid'
                                    ? 'Product Grid'
                                    : block.type === 'featureGrid'
                                      ? 'Features Grid'
                                      : block.type === 'richtext'
                                        ? 'Rich Text / Paragraph'
                                        : block.type}{' '}
                                  Block
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveBlock(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded disabled:opacity-30"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveBlock(index, 'down')}
                                  disabled={index === activeBlocks.length - 1}
                                  className="p-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded disabled:opacity-30"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeBlock(index)}
                                  className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded ml-2"
                                  title="Delete Block"
                                >
                                  ✖
                                </button>
                              </div>
                            </div>

                            {/* Block Fields Form */}
                            <div className="space-y-4 text-xs">
                              {block.type === 'hero' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Title
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.title || ''}
                                      onChange={e => editBlockField(index, 'title', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Background Image URL
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.bgImage || ''}
                                      onChange={e =>
                                        editBlockField(index, 'bgImage', e.target.value)
                                      }
                                      placeholder="e.g. /banners/landing.jpg"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Description
                                    </label>
                                    <textarea
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.description || ''}
                                      onChange={e =>
                                        editBlockField(index, 'description', e.target.value)
                                      }
                                      rows={2}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Button Label
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.btnText || ''}
                                      onChange={e =>
                                        editBlockField(index, 'btnText', e.target.value)
                                      }
                                      placeholder="Shop Now"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Button Link URL
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.btnLink || ''}
                                      onChange={e =>
                                        editBlockField(index, 'btnLink', e.target.value)
                                      }
                                      placeholder="/shop"
                                    />
                                  </div>
                                </div>
                              )}

                              {block.type === 'richtext' && (
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                    Paragraph Content (Markdown supported)
                                  </label>
                                  <textarea
                                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a] font-mono"
                                    value={block.content || ''}
                                    onChange={e => editBlockField(index, 'content', e.target.value)}
                                    rows={6}
                                    placeholder="Use **bold** or *italic* text here..."
                                  />
                                </div>
                              )}

                              {block.type === 'banner' && (
                                <div className="grid grid-cols-6 gap-4">
                                  <div className="col-span-1">
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Emoji
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs text-center focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.emoji || ''}
                                      onChange={e => editBlockField(index, 'emoji', e.target.value)}
                                      placeholder="📢"
                                    />
                                  </div>
                                  <div className="col-span-5">
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Message Text
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.message || ''}
                                      onChange={e =>
                                        editBlockField(index, 'message', e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              )}

                              {block.type === 'productGrid' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="md:col-span-1">
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Grid Section Title
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.title || ''}
                                      onChange={e => editBlockField(index, 'title', e.target.value)}
                                      placeholder="Our Bestsellers"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Category Slug
                                    </label>
                                    <input
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.categorySlug || ''}
                                      onChange={e =>
                                        editBlockField(index, 'categorySlug', e.target.value)
                                      }
                                      placeholder="e.g. linen-shirts"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                      Item Display Limit
                                    </label>
                                    <input
                                      type="number"
                                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#1e3b8a]"
                                      value={block.limit || 4}
                                      onChange={e =>
                                        editBlockField(
                                          index,
                                          'limit',
                                          parseInt(e.target.value) || 4
                                        )
                                      }
                                      min={1}
                                      max={12}
                                    />
                                  </div>
                                </div>
                              )}

                              {block.type === 'featureGrid' && (
                                <div className="space-y-4">
                                  <span className="block text-[11px] font-bold text-slate-600">
                                    Feature Cards (Max 3 cards recommended)
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[0, 1, 2].map(cardIdx => {
                                      const card = block.items?.[cardIdx] || {
                                        emoji: '🌟',
                                        title: '',
                                        description: '',
                                      };
                                      return (
                                        <div
                                          key={cardIdx}
                                          className="border border-slate-100 p-3 rounded-xl bg-slate-50 space-y-2"
                                        >
                                          <div className="flex gap-2">
                                            <input
                                              className="w-10 border border-slate-200 rounded p-1.5 text-xs text-center bg-white"
                                              value={card.emoji || ''}
                                              onChange={e =>
                                                editCardField(
                                                  index,
                                                  cardIdx,
                                                  'emoji',
                                                  e.target.value
                                                )
                                              }
                                              placeholder="Icon"
                                            />
                                            <input
                                              className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white"
                                              value={card.title || ''}
                                              onChange={e =>
                                                editCardField(
                                                  index,
                                                  cardIdx,
                                                  'title',
                                                  e.target.value
                                                )
                                              }
                                              placeholder="Card Title"
                                            />
                                          </div>
                                          <textarea
                                            className="w-full border border-slate-200 rounded p-1.5 text-[11px] bg-white"
                                            value={card.description || ''}
                                            onChange={e =>
                                              editCardField(
                                                index,
                                                cardIdx,
                                                'description',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Card subtitle description..."
                                            rows={2}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {block.type === 'faq' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="block text-[11px] font-bold text-slate-600">
                                      Questions & Answers Accordions
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addFaqItem(index)}
                                      className="bg-[#1e3b8a] text-white font-bold py-1 px-2.5 rounded text-[10px]"
                                    >
                                      + Add FAQ Item
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {(block.items || []).map((faqItem: any, itemIdx: number) => (
                                      <div
                                        key={itemIdx}
                                        className="border border-slate-100 p-3 rounded-xl bg-slate-50 space-y-2 relative"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[10px] text-slate-500">
                                            Item #{itemIdx + 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeFaqItem(index, itemIdx)}
                                            className="text-red-500 text-[10px] hover:underline"
                                          >
                                            Remove Item
                                          </button>
                                        </div>
                                        <input
                                          className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white"
                                          value={faqItem.question || ''}
                                          onChange={e =>
                                            editFaqItemField(
                                              index,
                                              itemIdx,
                                              'question',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Question Text"
                                        />
                                        <textarea
                                          className="w-full border border-slate-200 rounded p-1.5 text-xs bg-white"
                                          value={faqItem.answer || ''}
                                          onChange={e =>
                                            editFaqItemField(
                                              index,
                                              itemIdx,
                                              'answer',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Answer Text"
                                          rows={2}
                                        />
                                      </div>
                                    ))}
                                    {(!block.items || block.items.length === 0) && (
                                      <p className="text-[11px] text-slate-400 italic text-center py-2">
                                        No FAQ items added yet. Click "+ Add FAQ Item".
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Block Toolbar */}
                    <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 mr-2">Add Block:</span>
                      <button
                        type="button"
                        onClick={() => addBlockType('hero')}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs shadow-sm"
                      >
                        🖼️ Hero Banner
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlockType('richtext')}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs shadow-sm"
                      >
                        📝 Rich Text
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlockType('banner')}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs shadow-sm"
                      >
                        📢 Alert Banner
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlockType('productGrid')}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs shadow-sm"
                      >
                        🛒 Product Grid
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlockType('featureGrid')}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs shadow-sm"
                      >
                        🌟 Feature Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlockType('faq')}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs shadow-sm"
                      >
                        ❓ FAQ Accordions
                      </button>
                    </div>
                  </div>
                )}

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
