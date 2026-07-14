'use client';

import React, { useEffect, useState } from 'react';

interface WebhookLog {
  id: string;
  source: string;
  event: string;
  status: 'ok' | 'error' | 'retrying' | 'ignored';
  statusCode: number | null;
  errorMsg: string | null;
  receivedAt: string;
  processedAt: string | null;
}

interface Stats {
  total: number;
  errors: number;
  last24h: number;
}

export default function WebhooksTab() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<WebhookLog | null>(null);
  const [activePayload, setActivePayload] = useState<string | null>(null);
  const [payloadLoading, setPayloadLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (sourceFilter) q.set('source', sourceFilter);
      if (statusFilter) q.set('status', statusFilter);
      const res = await fetch(`/api/admin/webhooks?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
        setStats(json.stats || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, statusFilter]);

  const loadPayload = async (log: WebhookLog) => {
    setActiveLog(log);
    setPayloadLoading(true);
    setActivePayload(null);
    try {
      const res = await fetch(`/api/admin/webhooks/${log.id}`);
      if (res.ok) {
        const json = await res.json();
        setActivePayload(json.payload);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPayloadLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="webhooks-container">
      {/* Summary Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Inbound Webhooks</span>
            <span className="stat-value">{stats.total.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Failed Deliveries</span>
            <span className={`stat-value ${stats.errors > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {stats.errors.toLocaleString()}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Received (Last 24h)</span>
            <span className="stat-value text-indigo-600">{stats.last24h.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="toolbar">
        <div className="filter-group">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="select-input"
          >
            <option value="">All Sources</option>
            <option value="stripe">Stripe</option>
            <option value="paysky">PaySky</option>
            <option value="paymob">Paymob</option>
            <option value="fawry">Fawry</option>
            <option value="bosta">Bosta</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select-input"
          >
            <option value="">All Statuses</option>
            <option value="ok">Success (OK)</option>
            <option value="error">Failed (Error)</option>
            <option value="retrying">Retrying</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>

        <button onClick={load} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="loading-state">Loading webhook logs…</div>
      ) : (
        <div className="table-wrapper">
          <table className="webhooks-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Event Type</th>
                <th>Status</th>
                <th>HTTP Code</th>
                <th>Error Message</th>
                <th>Received At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="table-row">
                  <td className="font-bold text-slate-700 capitalize">{log.source}</td>
                  <td className="font-mono text-xs text-indigo-600">{log.event}</td>
                  <td>
                    <span className={`badge badge-${log.status}`}>{log.status}</span>
                  </td>
                  <td className="font-mono text-sm">{log.statusCode || '—'}</td>
                  <td
                    className="text-xs text-rose-500 max-w-[200px] truncate"
                    title={log.errorMsg || ''}
                  >
                    {log.errorMsg || '—'}
                  </td>
                  <td className="text-slate-500 text-xs">
                    {new Date(log.receivedAt).toLocaleString()}
                  </td>
                  <td>
                    <button onClick={() => loadPayload(log)} className="btn-action">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No webhooks found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspector Side Drawer */}
      {activeLog && (
        <div className="drawer-overlay" onClick={() => setActiveLog(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Inspect Webhook Delivery</h3>
              <button onClick={() => setActiveLog(null)} className="btn-close">
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <div className="meta-grid">
                <div>
                  <label>ID</label>
                  <span>{activeLog.id}</span>
                </div>
                <div>
                  <label>Provider / Source</label>
                  <span className="capitalize">{activeLog.source}</span>
                </div>
                <div>
                  <label>Event Type</label>
                  <span className="font-mono text-indigo-600">{activeLog.event}</span>
                </div>
                <div>
                  <label>Received At</label>
                  <span>{new Date(activeLog.receivedAt).toLocaleString()}</span>
                </div>
                <div>
                  <label>Status</label>
                  <span className={`badge badge-${activeLog.status}`}>{activeLog.status}</span>
                </div>
                {activeLog.statusCode && (
                  <div>
                    <label>HTTP Response Code</label>
                    <span>{activeLog.statusCode}</span>
                  </div>
                )}
              </div>

              {activeLog.errorMsg && (
                <div className="error-box">
                  <strong>Error Message:</strong>
                  <p>{activeLog.errorMsg}</p>
                </div>
              )}

              <div className="payload-box">
                <label>Raw Payload JSON</label>
                {payloadLoading ? (
                  <div className="payload-loading">Loading JSON payload…</div>
                ) : activePayload ? (
                  <pre className="json-display">
                    {JSON.stringify(JSON.parse(activePayload), null, 2)}
                  </pre>
                ) : (
                  <div className="payload-error">Failed to load payload.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .webhooks-container {
          padding: 4px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .stat-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 16px;
        }
        .filter-group {
          display: flex;
          gap: 8px;
        }
        .select-input {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          background: #fff;
          color: #334155;
          outline: none;
        }
        .select-input:focus {
          border-color: #534ab7;
        }
        .btn-refresh {
          padding: 8px 14px;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          color: #475569;
          transition: background 150ms ease;
        }
        .btn-refresh:hover {
          background: #f8fafc;
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
        .webhooks-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .webhooks-table th {
          background: #f8fafc;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .webhooks-table td {
          padding: 14px 16px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .table-row:hover {
          background: #f8fafc;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-ok {
          background: #dcfce7;
          color: #15803d;
        }
        .badge-error {
          background: #fee2e2;
          color: #b91c1c;
        }
        .badge-retrying {
          background: #fef9c3;
          color: #a16207;
        }
        .badge-ignored {
          background: #f1f5f9;
          color: #475569;
        }
        .btn-action {
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
          color: #475569;
        }
        .btn-action:hover {
          background: #cbd5e1;
          color: #1e293b;
        }
        .empty-state {
          padding: 48px;
          text-align: center;
          color: #94a3b8;
        }
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 100;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 200ms ease;
        }
        .drawer-content {
          width: 550px;
          background: #fff;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
          animation: slideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .drawer-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .drawer-header h3 {
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
        .drawer-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .meta-grid label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .meta-grid span {
          font-size: 13px;
          color: #1e293b;
          word-break: break-all;
        }
        .error-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
        }
        .error-box strong {
          color: #991b1b;
          display: block;
          margin-bottom: 4px;
        }
        .error-box p {
          color: #b91c1c;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .payload-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .payload-box label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .payload-loading {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }
        .json-display {
          background: #0f172a;
          color: #38bdf8;
          padding: 14px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre;
          word-wrap: normal;
          max-height: 400px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
