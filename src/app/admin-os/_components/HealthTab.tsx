'use client';

import React, { useEffect, useState } from 'react';

interface Service {
  ok: boolean;
  latencyMs?: number;
  configured?: number;
  detail?: Record<string, boolean>;
}

interface HealthData {
  timestamp: string;
  services: {
    database: Service;
    redis: Service;
    email: Service;
    paymentGateways: Service;
  };
  metrics: {
    pluginTestFailures: number;
    jobFailures24h: number;
    webhookErrors24h: number;
    orders24h: number;
  };
  pluginHooks: Array<{ hook: string; pluginSlug: string }>;
  env: {
    appUrl: string;
    nodeEnv: string;
  };
}

export default function HealthTab() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/health');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="health-container">
      {/* Header bar */}
      <div className="toolbar">
        <div>
          <h2 className="title">System Performance & Health</h2>
          <p className="desc">
            Real-time status of critical infrastructure, integrations, and server telemetry.
          </p>
        </div>
        <button onClick={load} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Pinging infrastructure…</div>
      ) : data ? (
        <div className="health-content">
          {/* Services grid */}
          <div className="grid-3">
            {/* Database Status Card */}
            <div className={`status-card ${data.services.database.ok ? 'ok' : 'error'}`}>
              <div className="card-header">
                <h3>Postgres Database</h3>
                <span className="dot" />
              </div>
              <div className="card-body">
                <span className="status-text">
                  {data.services.database.ok ? 'Connected' : 'Offline'}
                </span>
                {data.services.database.ok && (
                  <span className="latency">Ping: {data.services.database.latencyMs}ms</span>
                )}
              </div>
            </div>

            {/* Redis Cache Status Card */}
            <div className={`status-card ${data.services.redis.ok ? 'ok' : 'warn'}`}>
              <div className="card-header">
                <h3>Redis Cache & Queue</h3>
                <span className="dot" />
              </div>
              <div className="card-body">
                <span className="status-text">
                  {data.services.redis.ok ? 'Connected' : 'Not Connected'}
                </span>
                {data.services.redis.ok ? (
                  <span className="latency">Ping: {data.services.redis.latencyMs}ms</span>
                ) : (
                  <span className="tip">Falling back to memory/DB adapters</span>
                )}
              </div>
            </div>

            {/* Email Provider Card */}
            <div className={`status-card ${data.services.email.ok ? 'ok' : 'warn'}`}>
              <div className="card-header">
                <h3>SMTP / Resend Email</h3>
                <span className="dot" />
              </div>
              <div className="card-body">
                <span className="status-text">
                  {data.services.email.ok ? 'Configured' : 'Missing Credentials'}
                </span>
                {!data.services.email.ok && (
                  <span className="tip">Add RESEND_API_KEY to enable transaction mail</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid-2 mt-6">
            {/* Critical Metrics panel */}
            <div className="panel">
              <h3 className="panel-title">Operational Telemetry (Last 24h)</h3>
              <div className="metrics-list">
                <div className="metric-item">
                  <span className="metric-label">Failed Webhooks</span>
                  <span
                    className={`metric-count ${data.metrics.webhookErrors24h > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}
                  >
                    {data.metrics.webhookErrors24h}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Failed Background Jobs</span>
                  <span
                    className={`metric-count ${data.metrics.jobFailures24h > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}
                  >
                    {data.metrics.jobFailures24h}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Broken Plugin Connectors</span>
                  <span
                    className={`metric-count ${data.metrics.pluginTestFailures > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}
                  >
                    {data.metrics.pluginTestFailures}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Orders Received</span>
                  <span className="metric-count text-indigo-600 font-semibold">
                    {data.metrics.orders24h}
                  </span>
                </div>
              </div>
            </div>

            {/* Gateways and environment panel */}
            <div className="panel">
              <h3 className="panel-title">Environment & Gateways</h3>
              <div className="meta-list">
                <div className="meta-item">
                  <strong>Platform URL</strong>
                  <span className="font-mono text-xs">{data.env.appUrl}</span>
                </div>
                <div className="meta-item">
                  <strong>Node Environment</strong>
                  <span className="font-mono text-xs uppercase">{data.env.nodeEnv}</span>
                </div>
                <div className="meta-item">
                  <strong>Payment Gateways</strong>
                  <div className="gateways-badges">
                    {Object.entries(data.services.paymentGateways.detail || {}).map(([gw, ok]) => (
                      <span key={gw} className={`gateway-badge ${ok ? 'ok' : 'off'}`}>
                        {gw.toUpperCase()}: {ok ? 'Active' : 'Offline'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plugin life cycle hooks */}
          <div className="panel mt-6">
            <h3 className="panel-title">Active Plugin Subscriptions ({data.pluginHooks.length})</h3>
            {data.pluginHooks.length > 0 ? (
              <div className="hooks-grid">
                {data.pluginHooks.map((h, i) => (
                  <div key={i} className="hook-card">
                    <span className="hook-name font-mono text-indigo-600 font-bold">{h.hook}</span>
                    <span className="hook-plugin font-sans text-xs text-slate-500">
                      Bound: {h.pluginSlug}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-hooks-text">
                No active custom plugins have registered hooks to life cycle events.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="loading-state">Failed to retrieve health telemetry.</div>
      )}

      <style jsx>{`
        .health-container {
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
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .mt-6 {
          margin-top: 24px;
        }
        .status-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          position: relative;
        }
        .status-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-card h3 {
          font-size: 14px;
          font-weight: 700;
          color: #475569;
        }
        .status-card .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-card.ok .dot {
          background: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
        }
        .status-card.warn .dot {
          background: #f59e0b;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
        }
        .status-card.error .dot {
          background: #ef4444;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
        }
        .status-card .card-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .status-text {
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
        }
        .latency,
        .tip {
          font-size: 12px;
          color: #64748b;
        }
        .panel {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .panel-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }
        .metrics-list,
        .meta-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .metric-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          align-items: center;
        }
        .metric-label {
          color: #475569;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
        }
        .meta-item strong {
          color: #475569;
          font-size: 12px;
        }
        .gateways-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .gateway-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        .gateway-badge.ok {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .gateway-badge.off {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .hooks-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .hook-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hook-name {
          font-size: 13px;
        }
        .empty-hooks-text {
          font-size: 13px;
          color: #94a3b8;
          text-align: center;
          padding: 12px;
        }
      `}</style>
    </div>
  );
}
