'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Lead {
  id: string;
  storeName: string;
  category: string | null;
  phone: string | null;
  socialUrl: string | null;
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
}

export default function LeadsBank() {
  const [items, setItems] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState('UNVERIFIED');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/leads?status=${status}`);
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items);
    setCounts(data.counts);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const importFile = async (file: File) => {
    setBusy(true);
    setMessage('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/admin/leads', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    setMessage(
      res.ok ? `Added ${data.added}, skipped ${data.skipped} duplicates` : data.message || 'Failed'
    );
    setBusy(false);
    void load();
  };

  const review = async (id: string, next: Lead['status']) => {
    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    });
    void load();
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="card-title">Leads bank</h2>
        <div className="flex items-center gap-2">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {['UNVERIFIED', 'VERIFIED', 'REJECTED'].map(s => (
              <option key={s} value={s}>
                {s} ({counts[s] ?? 0})
              </option>
            ))}
          </select>
          <button className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? 'Importing…' : 'Get leads'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            hidden
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void importFile(file);
            }}
          />
        </div>
      </div>
      {message && <p className="text-sm mb-3">{message}</p>}
      <table className="w-full text-sm">
        <tbody>
          {items.map(lead => (
            <tr key={lead.id}>
              <td>{lead.storeName}</td>
              <td>{lead.category}</td>
              <td>{lead.phone}</td>
              <td>
                {lead.socialUrl && (
                  <a href={lead.socialUrl} target="_blank" rel="noreferrer">
                    Open page
                  </a>
                )}
              </td>
              <td className="whitespace-nowrap">
                <button onClick={() => review(lead.id, 'VERIFIED')}>Verify</button>{' '}
                <button onClick={() => review(lead.id, 'REJECTED')}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
