'use client';

// Plugins / Integrations tab — Shopify-style "App Store" for the platform.
// Three-column layout:
//
//   [ category rail ]   [ plugin grid ]   [ plugin detail (drawer) ]
//
// Each plugin card shows:
//   • icon + name + vendor
//   • category pill
//   • enabled/disabled toggle
//   • "configured via env" badge if the matching env-var is set on the host
//   • last-test result indicator (green check / red x / grey dash)
//
// Clicking a card opens a side drawer with the plugin's fields (each
// rendered to its declared type), a save button, and a "test connection"
// button that pings the integration.

import React, { useEffect, useMemo, useState } from 'react';

interface PluginField {
  key: string;
  label: string;
  description?: string;
  type: 'text' | 'secret' | 'url' | 'toggle' | 'select';
  required?: boolean;
  choices?: Array<{ value: string; label: string }>;
}

interface PluginItem {
  slug: string;
  name: string;
  category: string;
  vendor: string;
  description: string;
  icon: string;
  docsUrl?: string;
  fields: PluginField[];
  envVars?: string[];
  installed: boolean;
  isEnabled: boolean;
  lastTestOk: boolean | null;
  lastTestAt: string | null;
  lastTestMsg: string | null;
  configMasked: Record<string, string>;
  envConfigured: boolean;
}

interface CategoryGroup {
  slug: string;
  label: string;
  icon: string;
  description: string;
  plugins: PluginItem[];
}

export default function PluginsTab() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [allPlugins, setAllPlugins] = useState<PluginItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>('STORE');
  const [active, setActive] = useState<PluginItem | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plugins');
      const json = await res.json();
      setCategories(json.categories || []);
      setAllPlugins(json.plugins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const installPlugin = async (slug: string) => {
    setInstallingSlug(slug);
    try {
      const res = await fetch('/api/admin/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, isEnabled: false }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Installation failed');
      }
      await load();
      alert(`Successfully installed plugin! You can now configure it.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setInstallingSlug(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visiblePlugins = useMemo(() => {
    if (activeCat === 'STORE') {
      if (!search.trim()) return allPlugins;
      const q = search.toLowerCase();
      return allPlugins.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    const cat = categories.find(c => c.slug === activeCat);
    if (!cat) return [];
    // Only show installed plugins in standard categories
    const installedPlugins = cat.plugins.filter(p => p.installed);
    if (!search.trim()) return installedPlugins;
    const q = search.toLowerCase();
    return installedPlugins.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [categories, allPlugins, activeCat, search]);

  if (loading)
    return <div className="p-12 text-center text-slate-400 text-sm">Loading plugins…</div>;

  return (
    <div className="plugins-shell">
      {error && <div className="plugins-error">{error}</div>}

      <div className="plugins-grid">
        {/* Category rail */}
        <aside className="plugins-rail">
          <div className="px-3 mb-3">
            <input
              type="search"
              placeholder="Search plugins…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="plugins-search"
            />
          </div>

          <button
            onClick={() => setActiveCat('STORE')}
            className={`plugins-rail-btn ${activeCat === 'STORE' ? 'is-active' : ''}`}
            style={{
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '14px',
              marginBottom: '8px',
            }}
          >
            <span className="plugins-rail-icon">🛍️</span>
            <span className="plugins-rail-label font-bold text-indigo-600">App Store</span>
            <span className="plugins-rail-count font-bold text-indigo-500">
              {allPlugins.filter(p => !p.installed).length} new
            </span>
          </button>

          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setActiveCat(cat.slug)}
              className={`plugins-rail-btn ${activeCat === cat.slug ? 'is-active' : ''}`}
            >
              <span className="plugins-rail-icon">{cat.icon}</span>
              <span className="plugins-rail-label">{cat.label}</span>
              <span className="plugins-rail-count">
                {cat.plugins.filter(p => p.installed && p.isEnabled).length}/
                {cat.plugins.filter(p => p.installed).length}
              </span>
            </button>
          ))}
        </aside>

        {/* Plugin grid */}
        <main className="plugins-main">
          <header className="plugins-main-head">
            {activeCat === 'STORE' ? (
              <div>
                <h2 className="plugins-main-title">
                  <span className="text-2xl">🛍️</span>
                  App Store (Extensions Discovery)
                </h2>
                <p className="plugins-main-desc">
                  Browse and install integrations on-demand to extend your marketplace
                  functionality.
                </p>
              </div>
            ) : (
              (() => {
                const cat = categories.find(c => c.slug === activeCat);
                return (
                  <>
                    <div>
                      <h2 className="plugins-main-title">
                        <span className="text-2xl">{cat?.icon}</span>
                        {cat?.label}
                      </h2>
                      <p className="plugins-main-desc">{cat?.description}</p>
                    </div>
                  </>
                );
              })()
            )}
          </header>

          <div className="plugins-cards">
            {visiblePlugins.map(plugin => (
              <button
                key={plugin.slug}
                onClick={() => setActive(plugin)}
                className={`plugin-card ${plugin.isEnabled ? 'is-enabled' : ''}`}
              >
                <div className="plugin-card-head">
                  <div className="plugin-icon">
                    {/* Plugins ship without icons by default — show the first letter */}
                    <span>{plugin.name[0]}</span>
                  </div>
                  <div className="plugin-card-name">
                    <h3>{plugin.name}</h3>
                    <span className="plugin-card-vendor">{plugin.vendor}</span>
                  </div>
                  <PluginStatus plugin={plugin} />
                </div>
                <p className="plugin-card-desc">{plugin.description}</p>
                <div
                  className="plugin-card-foot"
                  style={{ display: 'flex', alignItems: 'center', width: '100%' }}
                >
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                    {plugin.envConfigured && !plugin.installed && (
                      <span className="plugin-card-tag plugin-card-tag-info">
                        Configured via env
                      </span>
                    )}
                    {plugin.installed && (
                      <span
                        className={`plugin-card-tag ${plugin.isEnabled ? 'plugin-card-tag-ok' : 'plugin-card-tag-off'}`}
                      >
                        {plugin.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    )}
                    {!plugin.installed && !plugin.envConfigured && (
                      <span className="plugin-card-tag plugin-card-tag-muted">Not configured</span>
                    )}
                  </div>

                  {activeCat === 'STORE' && !plugin.installed && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        installPlugin(plugin.slug);
                      }}
                      disabled={installingSlug === plugin.slug}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '11px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      {installingSlug === plugin.slug ? (
                        <span className="inline-block animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        '📥'
                      )}
                      Install
                    </button>
                  )}
                </div>
              </button>
            ))}
            {visiblePlugins.length === 0 && (
              <div className="col-span-2 py-12 text-center text-slate-400 text-sm">
                No plugins match "{search}"
              </div>
            )}

            {activeCat === 'STORE' && (
              <div
                style={{
                  gridColumn: 'span 2',
                  marginTop: '32px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🛠️ Developer Center: How to Add Custom Plugins & Integrations
                </h3>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                  }}
                >
                  Brandy Egyptian local marketplace is built with a modular, highly extensible
                  plugin registry system. You can easily add and package your custom microservices,
                  payment processors, custom CRM webhooks, and trackers by following these steps:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <h4
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#475569',
                        marginBottom: '6px',
                      }}
                    >
                      1. Register in Code
                    </h4>
                    <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                      Open <code>src/lib/plugin-registry.ts</code> and append a new{' '}
                      <code>PluginDefinition</code> inside the <code>PLUGIN_REGISTRY</code> array.
                      Define your custom parameters, secure credential fields, and vendor metadata.
                    </p>
                  </div>
                  <div>
                    <h4
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#475569',
                        marginBottom: '6px',
                      }}
                    >
                      2. Provision and Execute
                    </h4>
                    <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                      Once registered, the extension dynamically appears here in the discovery
                      board. Click <strong>Install</strong> to provision its row in the PostgreSQL
                      database. Implement execution middleware checks inside{' '}
                      <code>src/components/Plugins.tsx</code> to activate it on-demand!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {active && (
        <PluginDrawer
          plugin={active}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            load();
          }}
        />
      )}

      <style jsx>{`
        .plugins-shell {
          position: relative;
        }
        .plugins-error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          font-size: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .plugins-grid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 24px;
          align-items: start;
        }
        .plugins-rail {
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 80px);
          overflow: auto;
          padding: 16px 0;
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
        }
        .plugins-search {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .plugins-search:focus {
          border-color: #534ab7;
        }
        .plugins-rail-btn {
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
        }
        .plugins-rail-btn:hover {
          background: #f8fafc;
        }
        .plugins-rail-btn.is-active {
          background: #f5f3ff;
          color: #534ab7;
          font-weight: 600;
          border-left-color: #534ab7;
        }
        .plugins-rail-icon {
          font-size: 16px;
        }
        .plugins-rail-label {
          flex: 1;
        }
        .plugins-rail-count {
          font-size: 10px;
          color: #94a3b8;
          font-variant-numeric: tabular-nums;
        }
        .plugins-main {
          padding: 0 4px;
        }
        .plugins-main-head {
          margin-bottom: 24px;
        }
        .plugins-main-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .plugins-main-desc {
          font-size: 13px;
          color: #64748b;
        }
        .plugins-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .plugin-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .plugin-card:hover {
          border-color: #534ab7;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(83, 74, 183, 0.08);
        }
        .plugin-card.is-enabled {
          border-color: #10b981;
        }
        .plugin-card-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .plugin-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f5f3ff;
          color: #534ab7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
        }
        .plugin-card-name {
          flex: 1;
          min-width: 0;
        }
        .plugin-card-name h3 {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 2px 0;
        }
        .plugin-card-vendor {
          font-size: 11px;
          color: #94a3b8;
        }
        .plugin-card-desc {
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }
        .plugin-card-foot {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .plugin-card-tag {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 999px;
        }
        .plugin-card-tag-ok {
          background: #d1fae5;
          color: #065f46;
        }
        .plugin-card-tag-off {
          background: #f1f5f9;
          color: #64748b;
        }
        .plugin-card-tag-info {
          background: #dbeafe;
          color: #1e40af;
        }
        .plugin-card-tag-muted {
          background: #f1f5f9;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function PluginStatus({ plugin }: { plugin: PluginItem }) {
  if (plugin.lastTestOk === true) return <span title={`Last tested: OK`}>✅</span>;
  if (plugin.lastTestOk === false) return <span title={plugin.lastTestMsg ?? 'Failed'}>❌</span>;
  if (plugin.installed) return <span title="Installed">⚙️</span>;
  return null;
}

function PluginDrawer({
  plugin,
  onClose,
  onSaved,
}: {
  plugin: PluginItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(plugin.isEnabled);
  const [config, setConfig] = useState<Record<string, string>>({ ...plugin.configMasked });
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: plugin.slug, isEnabled: enabled, config }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Save failed');
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const install = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: plugin.slug, isEnabled: false }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Installation failed');
      }
      alert('Extension successfully installed! You can now configure it.');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Installation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div className="plugin-icon">
            <span>{plugin.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="drawer-title">{plugin.name}</h2>
            <p className="drawer-vendor">{plugin.vendor}</p>
          </div>
          <button onClick={onClose} className="drawer-close">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {err && <div className="drawer-err">{err}</div>}

          {!plugin.installed ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: '#f5f3ff',
                  color: '#534ab7',
                  fontSize: '28px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                {plugin.name[0]}
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                {plugin.name}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                }}
              >
                {plugin.description}
              </p>
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: '#1e40af',
                  textAlign: 'left',
                  lineHeight: '1.5',
                  marginBottom: '32px',
                }}
              >
                💡 Installing this integration will securely provision its credentials ledger in
                your workspace DB. You'll be able to toggle it live and configure secrets instantly
                post-installation.
              </div>
              <button
                onClick={install}
                disabled={saving}
                style={{
                  width: '100%',
                  background: '#534ab7',
                  color: 'white',
                  fontWeight: '700',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  boxShadow: '0 4px 12px rgba(83, 74, 183, 0.2)',
                }}
              >
                {saving ? 'Installing...' : '📥 Install Extension'}
              </button>
            </div>
          ) : (
            <>
              <p className="drawer-desc">{plugin.description}</p>
              {plugin.docsUrl && (
                <a href={plugin.docsUrl} target="_blank" rel="noreferrer" className="drawer-link">
                  Open docs →
                </a>
              )}

              {plugin.envConfigured && (
                <div className="drawer-banner">
                  <span>ℹ️</span>
                  <p>
                    This plugin is also configured via environment variables (
                    {plugin.envVars?.join(', ')}). Values entered here override the env vars.
                  </p>
                </div>
              )}

              <div className="drawer-toggle-row">
                <div>
                  <strong>Enable {plugin.name}</strong>
                  <p className="text-xs text-slate-500">
                    Turn on to start using this integration on the storefront.
                  </p>
                </div>
                <Toggle value={enabled} onChange={setEnabled} />
              </div>

              <h3 className="drawer-section">Configuration</h3>
              <div className="drawer-fields">
                {plugin.fields.map(field => (
                  <div key={field.key} className="drawer-field">
                    <label className="drawer-field-label">
                      {field.label}
                      {field.required && <span className="text-rose-500"> *</span>}
                    </label>
                    {field.description && <p className="drawer-field-desc">{field.description}</p>}
                    {field.type === 'toggle' ? (
                      <Toggle
                        value={config[field.key] === 'true'}
                        onChange={v => setConfig({ ...config, [field.key]: v ? 'true' : 'false' })}
                      />
                    ) : field.type === 'select' && field.choices ? (
                      <select
                        className="drawer-input"
                        value={config[field.key] ?? ''}
                        onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                      >
                        <option value="">— Select —</option>
                        {field.choices.map(c => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'secret' ? (
                      <div className="drawer-secret">
                        <input
                          type={shown.has(field.key) ? 'text' : 'password'}
                          className="drawer-input"
                          value={config[field.key] ?? ''}
                          placeholder="(unchanged)"
                          onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                        />
                        <button
                          onClick={() =>
                            setShown(s => {
                              const next = new Set(s);
                              if (next.has(field.key)) next.delete(field.key);
                              else next.add(field.key);
                              return next;
                            })
                          }
                          className="drawer-show"
                        >
                          {shown.has(field.key) ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    ) : (
                      <input
                        type={field.type === 'url' ? 'url' : 'text'}
                        className="drawer-input"
                        value={config[field.key] ?? ''}
                        onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>

              {plugin.lastTestAt && (
                <div className="drawer-test">
                  <h3 className="drawer-section">Last connection test</h3>
                  <p className="text-xs text-slate-500">
                    {new Date(plugin.lastTestAt).toLocaleString()} —{' '}
                    {plugin.lastTestOk ? '✅ OK' : '❌ Failed'}
                    {plugin.lastTestMsg && <span className="block mt-1">{plugin.lastTestMsg}</span>}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="drawer-foot">
          <button onClick={onClose} className="drawer-cancel" disabled={saving}>
            Cancel
          </button>
          {plugin.installed && (
            <button onClick={save} className="drawer-save" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
          backdrop-filter: blur(2px);
        }
        .drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 480px;
          max-width: 100%;
          background: #fff;
          box-shadow: -10px 0 32px rgba(0, 0, 0, 0.15);
          z-index: 41;
          display: flex;
          flex-direction: column;
        }
        .drawer-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .plugin-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f5f3ff;
          color: #534ab7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
        }
        .drawer-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
        .drawer-vendor {
          font-size: 11px;
          color: #94a3b8;
          margin: 0;
        }
        .drawer-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #94a3b8;
        }
        .drawer-body {
          flex: 1;
          overflow: auto;
          padding: 20px;
        }
        .drawer-err {
          background: #fef2f2;
          color: #b91c1c;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .drawer-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 8px 0;
        }
        .drawer-link {
          font-size: 12px;
          color: #534ab7;
        }
        .drawer-banner {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 10px;
          padding: 10px 12px;
          margin: 16px 0;
          font-size: 12px;
          color: #1e40af;
        }
        .drawer-banner p {
          margin: 0;
        }
        .drawer-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          margin: 16px 0;
        }
        .drawer-section {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin: 16px 0 8px 0;
        }
        .drawer-fields {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .drawer-field-label {
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          display: block;
          margin-bottom: 4px;
        }
        .drawer-field-desc {
          font-size: 11px;
          color: #64748b;
          margin: 0 0 6px 0;
        }
        .drawer-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
        }
        .drawer-input:focus {
          border-color: #534ab7;
          box-shadow: 0 0 0 3px rgba(83, 74, 183, 0.1);
        }
        .drawer-secret {
          display: flex;
          gap: 6px;
        }
        .drawer-show {
          font-size: 11px;
          padding: 4px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        .drawer-foot {
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .drawer-cancel {
          padding: 8px 16px;
          font-size: 13px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .drawer-save {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          background: #534ab7;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .drawer-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
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
