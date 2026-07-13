'use client';

import React, { useEffect, useState } from 'react';

interface JobLog {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  payload: string | null;
  result: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  failed: number;
  running: number;
  pending: number;
}

export default function JobsTab() {
  const [jobs, setJobs] = useState<JobLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [activeJob, setActiveJob] = useState<JobLog | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      if (nameFilter) q.set('name', nameFilter);
      const res = await fetch(`/api/admin/jobs?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.jobs || []);
        setStats(json.stats || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, [statusFilter, nameFilter]);

  return (
    <div className="jobs-container">
      {/* Stats Board */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Jobs (Audit Trail)</span>
            <span className="stat-value">{stats.total.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Running Queue</span>
            <span className="stat-value text-sky-600">{stats.running}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Failed Background Jobs</span>
            <span className={`stat-value ${stats.failed > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {stats.failed}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending Executions</span>
            <span className="stat-value text-amber-500">{stats.pending}</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by job name…"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            className="search-input"
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select-input"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="done">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <button onClick={load} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Job list table */}
      {loading && jobs.length === 0 ? (
        <div className="loading-state">Loading job queue…</div>
      ) : (
        <div className="table-wrapper">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created At</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="table-row">
                  <td className="font-mono text-sm font-semibold text-slate-800">{job.name}</td>
                  <td>
                    <span className={`badge badge-${job.status}`}>
                      {job.status === 'done' ? 'Completed' : job.status}
                    </span>
                  </td>
                  <td className="text-slate-600">{job.attempts}</td>
                  <td className="text-slate-500 text-xs">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="text-slate-500 text-xs">
                    {new Date(job.updatedAt).toLocaleString()}
                  </td>
                  <td>
                    <button onClick={() => setActiveJob(job)} className="btn-action">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No background jobs found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {activeJob && (
        <div className="drawer-overlay" onClick={() => setActiveJob(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Job Details & Logs</h3>
              <button onClick={() => setActiveJob(null)} className="btn-close">
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <div className="meta-grid">
                <div>
                  <label>Job ID</label>
                  <span>{activeJob.id}</span>
                </div>
                <div>
                  <label>Name</label>
                  <span className="font-mono text-slate-800">{activeJob.name}</span>
                </div>
                <div>
                  <label>Status</label>
                  <span className={`badge badge-${activeJob.status}`}>{activeJob.status}</span>
                </div>
                <div>
                  <label>Attempts</label>
                  <span>{activeJob.attempts}</span>
                </div>
                <div>
                  <label>Started At</label>
                  <span>{new Date(activeJob.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <label>Last Updated</label>
                  <span>{new Date(activeJob.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              {activeJob.payload && (
                <div className="log-section">
                  <label>Parameters (Payload)</label>
                  <pre className="code-display">
                    {JSON.stringify(JSON.parse(activeJob.payload), null, 2)}
                  </pre>
                </div>
              )}

              {activeJob.result && (
                <div className="log-section">
                  <label>Execution Result / Error Stack</label>
                  <pre
                    className={`code-display ${activeJob.status === 'failed' ? 'bg-red-950/30 border-red-900 text-rose-300' : 'bg-slate-900 text-sky-400'}`}
                  >
                    {activeJob.result}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .jobs-container {
          padding: 4px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
          font-size: 11px;
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
        .search-input {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          background: #fff;
          color: #334155;
          outline: none;
          width: 240px;
        }
        .search-input:focus {
          border-color: #534ab7;
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
        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .jobs-table th {
          background: #f8fafc;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .jobs-table td {
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
        .badge-pending {
          background: #fef3c7;
          color: #d97706;
        }
        .badge-running {
          background: #e0f2fe;
          color: #0369a1;
        }
        .badge-done {
          background: #dcfce7;
          color: #15803d;
        }
        .badge-failed {
          background: #fee2e2;
          color: #b91c1c;
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
        .log-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .log-section label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .code-display {
          background: #0f172a;
          color: #38bdf8;
          padding: 14px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          max-height: 250px;
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
