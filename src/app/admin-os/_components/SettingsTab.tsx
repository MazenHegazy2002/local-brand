'use client';

// Comprehensive Settings tab — the visual face of `admin-settings-registry.ts`.
//
// Layout: left rail = 15 categories (icons + labels). Right pane = the
// settings inside the selected category, grouped, searchable. Each setting
// auto-renders the right input type:
//
//   toggle    → switch
//   text      → input
//   longtext  → textarea
//   number    → number input (with range hint)
//   url       → url input
//   color     → color swatch + hex
//   select    → dropdown
//   secret    → masked input + show/hide
//   json      → multi-line JSON editor
//
// Saving is "save bar" style: changes accumulate into a dirty set; the
// admin clicks "Save changes" to commit them all at once via PATCH.

import React, { useEffect, useMemo, useState } from 'react';

interface RegistryItem {
  key: string;
  category: string;
  type: 'toggle' | 'text' | 'longtext' | 'number' | 'select' | 'url' | 'secret' | 'json' | 'color';
  label: string;
  description?: string;
  defaultValue: unknown;
  choices?: Array<{ value: string; label: string }>;
  range?: [number, number];
  group?: string;
  sensitive?: boolean;
  value: string; // serialized current value
  isDefault: boolean;
  updatedAt: string | null;
}

interface CategoryGroup {
  slug: string;
  label: string;
  icon: string;
  description: string;
  items: RegistryItem[];
}

export default function SettingsTab() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [activeCat, setActiveCat] = useState<string>('store');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState<Map<string, unknown>>(new Map());
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ── Filtered list (search across all categories) ────────────────────────
  const visibleItems: RegistryItem[] = useMemo(() => {
    const cat = categories.find(c => c.slug === activeCat);
    if (!cat) return [];
    if (!search.trim()) return cat.items;
    const q = search.toLowerCase();
    return cat.items.filter(
      i =>
        i.label.toLowerCase().includes(q) ||
        i.key.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q)
    );
  }, [categories, activeCat, search]);

  const itemsByGroup = useMemo(() => {
    const groups = new Map<string, RegistryItem[]>();
    for (const item of visibleItems) {
      const g = item.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  // ── Mutators ────────────────────────────────────────────────────────────
  const setLocal = (key: string, value: unknown) => {
    setDirty(prev => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  };

  const currentValue = (item: RegistryItem): unknown => {
    if (dirty.has(item.key)) return dirty.get(item.key);
    // Coerce the serialized string back into the typed value.
    switch (item.type) {
      case 'toggle':
        return item.value === 'true' || item.value === '1';
      case 'number':
        return Number(item.value);
      case 'json':
        try {
          return item.value ? JSON.parse(item.value) : item.defaultValue;
        } catch {
          return item.defaultValue;
        }
      default:
        return item.value;
    }
  };

  const saveAll = async () => {
    if (dirty.size === 0) return;
    setSaving(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: Array.from(dirty.entries()).map(([key, value]) => ({ key, value })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const failures = j.failures
          ? '\n' +
            j.failures
              .map((f: { key: string; reason: string }) => `• ${f.key}: ${f.reason}`)
              .join('\n')
          : '';
        throw new Error((j.message || 'Save failed') + failures);
      }
      setDirty(new Map());
      setSavedAt(new Date());
      await loadAll();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetDirty = () => setDirty(new Map());

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading)
    return <div className="p-12 text-center text-slate-400 text-sm">Loading settings…</div>;

  return (
    <div className="settings-shell">
      {errorBanner && (
        <div className="settings-banner-error">
          <span>⚠️</span>
          <pre className="m-0 whitespace-pre-wrap font-sans">{errorBanner}</pre>
          <button onClick={() => setErrorBanner(null)} className="ml-auto text-slate-500">
            ✕
          </button>
        </div>
      )}

      <div className="settings-grid">
        {/* Left rail — categories */}
        <aside className="settings-rail">
          <div className="px-3 mb-3">
            <input
              type="search"
              placeholder="Search settings…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="settings-search"
            />
          </div>
          <nav>
            {categories.map(cat => {
              const dirtyCount = Array.from(dirty.keys()).filter(k =>
                cat.items.some(i => i.key === k)
              ).length;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCat(cat.slug)}
                  className={`settings-rail-btn ${activeCat === cat.slug ? 'is-active' : ''}`}
                  title={cat.description}
                >
                  <span className="settings-rail-icon">{cat.icon}</span>
                  <span className="settings-rail-label">{cat.label}</span>
                  {dirtyCount > 0 && <span className="settings-rail-badge">{dirtyCount}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right pane — settings */}
        <section className="settings-pane">
          {(() => {
            const cat = categories.find(c => c.slug === activeCat);
            if (!cat) return <div className="text-slate-400 text-sm">Select a category</div>;
            return (
              <>
                <header className="settings-pane-head">
                  <div>
                    <h2 className="settings-pane-title">
                      <span className="text-2xl">{cat.icon}</span>
                      {cat.label}
                    </h2>
                    <p className="settings-pane-desc">{cat.description}</p>
                  </div>
                </header>

                {itemsByGroup.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No settings match "{search}"
                  </div>
                )}

                {itemsByGroup.map(([groupName, items]) => (
                  <div key={groupName} className="settings-group">
                    {groupName && <h3 className="settings-group-title">{groupName}</h3>}
                    <div className="settings-list">
                      {items.map(item => (
                        <SettingRow
                          key={item.key}
                          item={item}
                          value={currentValue(item)}
                          onChange={v => setLocal(item.key, v)}
                          isDirty={dirty.has(item.key)}
                          isShown={shown.has(item.key)}
                          onToggleShown={() => {
                            setShown(s => {
                              const next = new Set(s);
                              if (next.has(item.key)) next.delete(item.key);
                              else next.add(item.key);
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </section>
      </div>

      {/* Sticky save bar */}
      {(dirty.size > 0 || savedAt) && (
        <div className="settings-savebar">
          {dirty.size > 0 ? (
            <>
              <span>
                {dirty.size} unsaved {dirty.size === 1 ? 'change' : 'changes'}
              </span>
              <div className="ml-auto flex gap-2">
                <button onClick={resetDirty} className="settings-savebar-cancel" disabled={saving}>
                  Discard
                </button>
                <button onClick={saveAll} className="settings-savebar-save" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </>
          ) : (
            <span className="text-emerald-400">✓ Saved at {savedAt?.toLocaleTimeString()}</span>
          )}
        </div>
      )}

      <style jsx>{`
        .settings-shell {
          position: relative;
          min-height: 70vh;
        }
        .settings-banner-error {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          font-size: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 24px;
          align-items: start;
        }
        .settings-rail {
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 80px);
          overflow: auto;
          padding: 16px 0;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
        }
        .settings-search {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .settings-search:focus {
          border-color: #534ab7;
          box-shadow: 0 0 0 3px rgba(83, 74, 183, 0.1);
        }
        .settings-rail-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          font-size: 13px;
          color: #475569;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          border-left: 3px solid transparent;
          transition: background 120ms ease;
        }
        .settings-rail-btn:hover {
          background: #f8fafc;
        }
        .settings-rail-btn.is-active {
          background: #f5f3ff;
          color: #534ab7;
          font-weight: 600;
          border-left-color: #534ab7;
        }
        .settings-rail-icon {
          font-size: 16px;
          line-height: 1;
        }
        .settings-rail-label {
          flex: 1;
        }
        .settings-rail-badge {
          background: #534ab7;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
        }
        .settings-pane {
          padding: 0 4px 80px 4px;
        }
        .settings-pane-head {
          margin-bottom: 24px;
        }
        .settings-pane-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .settings-pane-desc {
          font-size: 13px;
          color: #64748b;
        }
        .settings-group {
          margin-bottom: 32px;
        }
        .settings-group-title {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 8px 0;
        }
        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          overflow: hidden;
        }
        .settings-savebar {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          min-width: 380px;
          max-width: calc(100% - 32px);
          z-index: 50;
        }
        .settings-savebar-cancel {
          background: none;
          border: 1px solid #475569;
          color: #cbd5e1;
          font-size: 12px;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
        }
        .settings-savebar-save {
          background: #534ab7;
          border: none;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .settings-savebar-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ─── Single setting row ──────────────────────────────────────────────────────
interface SettingRowProps {
  item: RegistryItem;
  value: unknown;
  onChange: (v: unknown) => void;
  isDirty: boolean;
  isShown: boolean;
  onToggleShown: () => void;
}

function SettingRow({ item, value, onChange, isDirty, isShown, onToggleShown }: SettingRowProps) {
  return (
    <div className="setting-row">
      <div className="setting-meta">
        <div className="setting-label">
          {item.label}
          {isDirty && <span className="setting-dot" title="Unsaved" />}
        </div>
        {item.description && <div className="setting-desc">{item.description}</div>}
        <code className="setting-key">{item.key}</code>
      </div>
      <div className="setting-control">
        {item.type === 'toggle' && <Toggle value={!!value} onChange={onChange} />}
        {item.type === 'text' && (
          <input
            className="setting-input"
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
          />
        )}
        {item.type === 'longtext' && (
          <textarea
            className="setting-input setting-textarea"
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
            rows={4}
          />
        )}
        {item.type === 'number' && (
          <input
            type="number"
            className="setting-input"
            value={value as number}
            onChange={e => onChange(Number(e.target.value))}
            min={item.range?.[0]}
            max={item.range?.[1]}
            step={item.range?.[1] && item.range[1] <= 1 ? 0.01 : 1}
          />
        )}
        {item.type === 'url' && (
          <input
            type="url"
            className="setting-input"
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
            placeholder="https://"
          />
        )}
        {item.type === 'select' && item.choices && (
          <select
            className="setting-input"
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
          >
            {item.choices.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        {item.type === 'secret' && (
          <div className="setting-secret">
            <input
              type={isShown ? 'text' : 'password'}
              className="setting-input"
              value={String(value ?? '')}
              onChange={e => onChange(e.target.value)}
              placeholder={item.value ? '(unchanged)' : ''}
            />
            <button onClick={onToggleShown} className="setting-show-btn">
              {isShown ? 'Hide' : 'Show'}
            </button>
          </div>
        )}
        {item.type === 'color' && (
          <div className="setting-color">
            <input
              type="color"
              value={String(value ?? '#000000')}
              onChange={e => onChange(e.target.value)}
              className="setting-color-swatch"
            />
            <input
              type="text"
              className="setting-input"
              value={String(value ?? '')}
              onChange={e => onChange(e.target.value)}
            />
          </div>
        )}
        {item.type === 'json' && (
          <textarea
            className="setting-input setting-textarea setting-json"
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={e => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // Keep raw string while invalid; the API validator will reject if it stays.
                onChange(e.target.value);
              }
            }}
            rows={5}
            spellCheck={false}
          />
        )}
      </div>

      <style jsx>{`
        .setting-row {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-meta {
          min-width: 0;
        }
        .setting-label {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .setting-desc {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.5;
        }
        .setting-key {
          display: inline-block;
          margin-top: 6px;
          font-size: 10px;
          color: #94a3b8;
          font-family: ui-monospace, monospace;
        }
        .setting-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f59e0b;
          display: inline-block;
        }
        .setting-control {
          min-width: 0;
        }
        .setting-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          background: #fff;
          color: #1e293b;
        }
        .setting-input:focus {
          border-color: #534ab7;
          box-shadow: 0 0 0 3px rgba(83, 74, 183, 0.1);
        }
        .setting-textarea {
          resize: vertical;
          font-family: inherit;
        }
        .setting-json {
          font-family: ui-monospace, monospace;
          font-size: 11px;
        }
        .setting-secret {
          display: flex;
          gap: 6px;
        }
        .setting-show-btn {
          font-size: 11px;
          padding: 4px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        .setting-color {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .setting-color-swatch {
          width: 36px;
          height: 36px;
          padding: 0;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          background: none;
        }
      `}</style>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`toggle ${value ? 'is-on' : ''}`}
    >
      <span className="toggle-thumb" />
      <style jsx>{`
        .toggle {
          width: 40px;
          height: 22px;
          border-radius: 999px;
          background: #e2e8f0;
          border: none;
          cursor: pointer;
          position: relative;
          padding: 0;
          transition: background 150ms ease;
        }
        .toggle.is-on {
          background: #534ab7;
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: transform 150ms ease;
        }
        .toggle.is-on .toggle-thumb {
          transform: translateX(18px);
        }
      `}</style>
    </button>
  );
}
