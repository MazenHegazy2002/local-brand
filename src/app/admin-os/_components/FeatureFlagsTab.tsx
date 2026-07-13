'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  scope: string;
  updatedAt: string;
}

export default function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newScope, setNewScope] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/feature-flags');
      if (res.ok) {
        const json = await res.json();
        setFlags(json.flags || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (key: string, currentVal: boolean) => {
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: !currentVal }),
      });
      if (res.ok) {
        setFlags(prev => prev.map(f => (f.key === key ? { ...f, enabled: !currentVal } : f)));
        toast({
          title: `Feature flag "${key}" updated successfully`,
          variant: 'success',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateScope = async (key: string, scope: string) => {
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, scope }),
      });
      if (res.ok) {
        setFlags(prev => prev.map(f => (f.key === key ? { ...f, scope } : f)));
        toast({
          title: `Feature flag "${key}" scope updated to ${scope}`,
          variant: 'success',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newLabel) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          label: newLabel,
          description: newDesc,
          scope: newScope,
        }),
      });
      if (res.ok) {
        await load();
        setShowCreate(false);
        setNewKey('');
        setNewLabel('');
        setNewDesc('');
        setNewScope('ALL');
        toast({
          title: 'Custom feature flag created successfully',
          variant: 'success',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flags-container">
      {/* Header Bar */}
      <div className="toolbar">
        <div>
          <h2 className="title">Feature Flags Manager</h2>
          <p className="desc">
            Safely toggle beta features, integrations, and operational parameters by audience.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          ➕ Custom Flag
        </button>
      </div>

      {/* Flag Listing */}
      {loading ? (
        <div className="loading-state">Loading feature flags…</div>
      ) : (
        <div className="table-wrapper">
          <table className="flags-table">
            <thead>
              <tr>
                <th>Feature / Flag</th>
                <th>Audience Scope</th>
                <th>Toggle Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {flags.map(flag => (
                <tr key={flag.key} className="table-row">
                  <td>
                    <div className="flag-details">
                      <span className="flag-label">{flag.label}</span>
                      <span className="flag-key font-mono">{flag.key}</span>
                      {flag.description && <p className="flag-desc">{flag.description}</p>}
                    </div>
                  </td>
                  <td>
                    <select
                      value={flag.scope}
                      onChange={e => updateScope(flag.key, e.target.value)}
                      className="scope-selector"
                    >
                      <option value="ALL">All Environments (ALL)</option>
                      <option value="ADMIN">Admins Only (ADMIN)</option>
                      <option value="SELLER">Sellers & Admins (SELLER)</option>
                      <option value="BUYER">Logged-in Buyers (BUYER)</option>
                      <option value="STAGING">Staging Only (STAGING)</option>
                    </select>
                  </td>
                  <td>
                    <div className="toggle-wrapper">
                      <button
                        role="switch"
                        aria-checked={flag.enabled}
                        onClick={() => toggleFlag(flag.key, flag.enabled)}
                        className={`toggle ${flag.enabled ? 'is-on' : ''}`}
                      >
                        <span className="toggle-thumb" />
                      </button>
                      <span
                        className={`toggle-label ${flag.enabled ? 'text-green-600' : 'text-slate-500'}`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                  <td className="text-slate-500 text-xs">
                    {new Date(flag.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Custom Feature Flag</h3>
              <button onClick={() => setShowCreate(false)} className="btn-close">
                ✕
              </button>
            </div>
            <form onSubmit={createFlag} className="modal-form">
              <div className="form-group">
                <label>Flag Key (unique-slug)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. pilot-stripe-billing"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe Pilot Checkout"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Explain what this feature flag controls..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="form-input textarea"
                />
              </div>

              <div className="form-group">
                <label>Default Audience Scope</label>
                <select
                  value={newScope}
                  onChange={e => setNewScope(e.target.value)}
                  className="form-input"
                >
                  <option value="ALL">All Environments (ALL)</option>
                  <option value="ADMIN">Admins Only (ADMIN)</option>
                  <option value="SELLER">Sellers & Admins (SELLER)</option>
                  <option value="BUYER">Logged-in Buyers (BUYER)</option>
                  <option value="STAGING">Staging Only (STAGING)</option>
                </select>
              </div>

              <div className="modal-foot">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-save">
                  {creating ? 'Creating…' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .flags-container {
          padding: 4px;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .desc {
          font-size: 13px;
          color: #64748b;
        }
        .btn-primary {
          padding: 10px 18px;
          background: #534ab7;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 150ms ease;
        }
        .btn-primary:hover {
          background: #4338ca;
        }
        .loading-state {
          padding: 48px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }
        .table-wrapper {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .flags-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .flags-table th {
          background: #f8fafc;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .flags-table td {
          padding: 16px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .table-row:hover {
          background: #f8fafc;
        }
        .flag-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .flag-label {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }
        .flag-key {
          font-size: 11px;
          color: #6366f1;
        }
        .flag-desc {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
        }
        .scope-selector {
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          background: #fff;
          outline: none;
          color: #334155;
        }
        .scope-selector:focus {
          border-color: #534ab7;
        }
        .toggle-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
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
          background: #10b981;
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
        .toggle-label {
          font-size: 12px;
          font-weight: 600;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 200ms ease;
        }
        .modal-content {
          width: 480px;
          background: #fff;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: scaleUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }
        .btn-close {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #64748b;
        }
        .modal-form {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .form-input {
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          background: #fff;
        }
        .form-input:focus {
          border-color: #534ab7;
        }
        .textarea {
          min-height: 80px;
          resize: vertical;
        }
        .modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
        .btn-cancel {
          padding: 8px 16px;
          font-size: 13px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: #475569;
        }
        .btn-save {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          background: #534ab7;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .btn-save:disabled {
          opacity: 0.5;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleUp {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
