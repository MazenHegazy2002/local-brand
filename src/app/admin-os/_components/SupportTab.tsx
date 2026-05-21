'use client';

// Support tab — three sub-tabs sharing one inbox-style layout:
//   1. Disputes        (buyer ↔ seller conflicts on orders/items)
//   2. Returns / RMA   (RMA queue with approve/reject/refund)
//   3. Support tickets (general help inbox)
//
// Each sub-tab fetches from its own admin API endpoint and renders a
// flattened table — clicking a row opens a side drawer with full details
// and action buttons.

import React, { useEffect, useState } from 'react';

type SubTab = 'disputes' | 'returns' | 'tickets';

export default function SupportTab() {
  const [sub, setSub] = useState<SubTab>('disputes');
  return (
    <div>
      <div className="sup-tabs">
        {[
          { key: 'disputes', label: 'Disputes', icon: '⚖️' },
          { key: 'returns', label: 'Returns / RMA', icon: '↩️' },
          { key: 'tickets', label: 'Support Tickets', icon: '🎫' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key as SubTab)}
            className={`sup-tab ${sub === t.key ? 'is-active' : ''}`}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        {sub === 'disputes' && <DisputesPanel />}
        {sub === 'returns' && <ReturnsPanel />}
        {sub === 'tickets' && <TicketsPanel />}
      </div>
      <style jsx>{`
        .sup-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #f1f5f9;
          border-radius: 10px;
          width: fit-content;
        }
        .sup-tab {
          padding: 6px 14px;
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
        .sup-tab.is-active {
          background: #fff;
          color: #534ab7;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}

// ─── Disputes ───────────────────────────────────────────────────────────────
interface Dispute {
  id: string;
  orderId: string;
  orderItemId: string | null;
  reason: string;
  description: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'CLOSED';
  createdAt: string;
  user?: { name: string; email: string };
}

function DisputesPanel() {
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Disputes</h2>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="card-filter"
        >
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED_BUYER">Resolved (buyer)</option>
          <option value="RESOLVED_SELLER">Resolved (seller)</option>
          <option value="CLOSED">Closed</option>
          <option value="">All</option>
        </select>
      </div>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty msg="No disputes match" />
      ) : (
        <table className="sup-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Opened</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td>
                  <a
                    className="sup-link"
                    href={`/dashboard/orders/${d.orderId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #{d.orderId.slice(0, 8)}
                  </a>
                </td>
                <td className="max-w-md truncate">{d.reason}</td>
                <td>
                  <Pill status={d.status} />
                </td>
                <td className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleString()}</td>
                <td>
                  <select
                    onChange={e => updateStatus(d.id, e.target.value)}
                    value=""
                    className="sup-action-select"
                  >
                    <option value="" disabled>
                      Action
                    </option>
                    <option value="INVESTIGATING">Mark investigating</option>
                    <option value="RESOLVED_BUYER">Resolve in buyer's favor</option>
                    <option value="RESOLVED_SELLER">Resolve in seller's favor</option>
                    <option value="CLOSED">Close</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── Returns ────────────────────────────────────────────────────────────────
interface Return {
  id: string;
  orderItemId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
}
function ReturnsPanel() {
  const [items, setItems] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/returns?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    await fetch(`/api/admin/returns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Returns / RMA</h2>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="card-filter"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
          <option value="">All</option>
        </select>
      </div>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty msg="No returns match" />
      ) : (
        <table className="sup-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Opened</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id}>
                <td>
                  <code>{r.orderItemId.slice(0, 8)}</code>
                </td>
                <td className="max-w-md truncate">{r.reason}</td>
                <td>
                  <Pill status={r.status} />
                </td>
                <td className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="flex gap-2">
                  {r.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => updateStatus(r.id, 'APPROVED')}
                        className="rev-act rev-act-ok"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, 'REJECTED')}
                        className="rev-act rev-act-bad"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <button
                      onClick={() => updateStatus(r.id, 'COMPLETED')}
                      className="rev-act rev-act-ok"
                    >
                      Mark refunded
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── Tickets ────────────────────────────────────────────────────────────────
interface Ticket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: string;
  createdAt: string;
}
function TicketsPanel() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Support tickets</h2>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="card-filter"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="CLOSED">Closed</option>
          <option value="">All</option>
        </select>
      </div>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty msg="No tickets match" />
      ) : (
        <table className="sup-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id}>
                <td>{t.subject}</td>
                <td>
                  <Pill status={t.status} />
                </td>
                <td>{t.priority}</td>
                <td className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <style jsx>{tableStyles}</style>
    </div>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────────
function Loading() {
  return <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="p-12 text-center text-slate-400 text-sm">{msg}</div>;
}

function Pill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    OPEN: { bg: '#fef3c7', fg: '#92400e' },
    INVESTIGATING: { bg: '#dbeafe', fg: '#1e40af' },
    RESOLVED_BUYER: { bg: '#d1fae5', fg: '#065f46' },
    RESOLVED_SELLER: { bg: '#d1fae5', fg: '#065f46' },
    CLOSED: { bg: '#f1f5f9', fg: '#64748b' },
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    APPROVED: { bg: '#d1fae5', fg: '#065f46' },
    REJECTED: { bg: '#fee2e2', fg: '#b91c1c' },
    COMPLETED: { bg: '#dbeafe', fg: '#1e40af' },
    IN_PROGRESS: { bg: '#dbeafe', fg: '#1e40af' },
  };
  const s = colors[status] ?? colors.OPEN;
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
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const tableStyles = `
  .card { background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .card-title { font-size: 16px; font-weight: 700; margin: 0; }
  .card-filter { font-size: 12px; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
  .sup-table { width: 100%; border-collapse: collapse; }
  .sup-table th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .sup-table td { padding: 12px; border-bottom: 1px solid #f8fafc; font-size: 13px; vertical-align: middle; }
  .sup-link { color: #534AB7; }
  .sup-action-select { font-size: 11px; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px; }
  .rev-act { padding: 4px 12px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; }
  .rev-act-ok  { background: #d1fae5; color: #065f46; }
  .rev-act-bad { background: #fee2e2; color: #b91c1c; }
`;
