'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ShippingZone {
  id: string;
  name: string;
  governorates: string;
  rateEgp: number;
  defaultCourier: string | null;
  estDaysMin: number | null;
  estDaysMax: number | null;
  isActive: boolean;
  createdAt: string;
}

const BLANK: Omit<ShippingZone, 'id' | 'createdAt'> = {
  name: '',
  governorates: '',
  rateEgp: 0,
  defaultCourier: '',
  estDaysMin: null,
  estDaysMax: null,
  isActive: true,
};

export default function ShippingTab() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shipping');
      const data = await res.json();
      setZones(data.zones ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm(BLANK);
    setEditId('new');
    setMsg('');
  }

  function openEdit(z: ShippingZone) {
    setForm({
      name: z.name,
      governorates: z.governorates,
      rateEgp: Number(z.rateEgp),
      defaultCourier: z.defaultCourier ?? '',
      estDaysMin: z.estDaysMin,
      estDaysMax: z.estDaysMax,
      isActive: z.isActive,
    });
    setEditId(z.id);
    setMsg('');
  }

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        ...form,
        rateEgp: Number(form.rateEgp),
        defaultCourier: form.defaultCourier || null,
        estDaysMin: form.estDaysMin ? Number(form.estDaysMin) : null,
        estDaysMax: form.estDaysMax ? Number(form.estDaysMax) : null,
      };

      if (editId === 'new') {
        await fetch('/api/admin/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/admin/shipping/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setMsg('Saved ✓');
      setEditId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteZone(id: string) {
    if (!confirm('Delete this shipping zone?')) return;
    await fetch(`/api/admin/shipping/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggle(z: ShippingZone) {
    await fetch(`/api/admin/shipping/${z.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !z.isActive }),
    });
    load();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Define governorate zones and their flat shipping rates. The checkout and
            shipping-calculate API read these zones in priority; falling back to the hard-coded rate
            table only when no active zone matches.
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            padding: '7px 16px',
            background: '#534AB7',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Add Zone
        </button>
      </div>

      {msg && (
        <div
          style={{
            fontSize: 12,
            color: '#085041',
            background: '#f0fdf4',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
          }}
        >
          {msg}
        </div>
      )}

      {/* Zone form */}
      {editId !== null && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">{editId === 'new' ? 'New Zone' : 'Edit Zone'}</div>
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
          >
            <div>
              <label style={labelStyle}>Zone name *</label>
              <input
                style={inputStyle}
                placeholder="e.g. Greater Cairo"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Rate (EGP) *</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="60"
                value={form.rateEgp}
                onChange={e => setForm(f => ({ ...f, rateEgp: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Governorates (comma-separated) *</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              placeholder="Cairo, Giza, 6th of October"
              value={form.governorates}
              onChange={e => setForm(f => ({ ...f, governorates: e.target.value }))}
            />
            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
              Enter governorate names exactly as they appear in buyer addresses.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Default courier</label>
              <input
                style={inputStyle}
                placeholder="Aramex Egypt"
                value={form.defaultCourier ?? ''}
                onChange={e => setForm(f => ({ ...f, defaultCourier: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Est. days min</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="1"
                value={form.estDaysMin ?? ''}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    estDaysMin: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Est. days max</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="3"
                value={form.estDaysMax ?? ''}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    estDaysMax: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              marginBottom: 14,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            />
            Active (visible to buyers)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={save}
              disabled={saving || !form.name || !form.governorates}
              style={{
                padding: '7px 20px',
                background: '#534AB7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditId(null)}
              style={{
                padding: '7px 14px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Zones table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Loading shipping zones…
        </div>
      ) : zones.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            No zones yet. Add one to override the default rate table.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.5fr 80px 100px 80px 80px',
              gap: 8,
              padding: '8px 14px',
              fontSize: 11,
              color: '#94a3b8',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              fontWeight: 600,
            }}
          >
            <span>Zone</span>
            <span>Governorates</span>
            <span>Rate</span>
            <span>Courier</span>
            <span>Days</span>
            <span>Actions</span>
          </div>
          {zones.map(z => (
            <div
              key={z.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr 80px 100px 80px 80px',
                gap: 8,
                padding: '10px 14px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                alignItems: 'center',
                fontSize: 12,
                opacity: z.isActive ? 1 : 0.5,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{z.name}</div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: 2,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: z.isActive ? '#dcfce7' : '#f1f5f9',
                    color: z.isActive ? '#166534' : '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  {z.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {z.governorates}
              </span>
              <span style={{ fontWeight: 600, color: '#085041' }}>
                {Number(z.rateEgp).toLocaleString()} EGP
              </span>
              <span style={{ color: '#64748b' }}>{z.defaultCourier ?? '—'}</span>
              <span style={{ color: '#64748b' }}>
                {z.estDaysMin && z.estDaysMax ? `${z.estDaysMin}–${z.estDaysMax}d` : '—'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => openEdit(z)}
                  style={{
                    fontSize: 11,
                    color: '#534AB7',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => toggle(z)}
                  style={{
                    fontSize: 11,
                    color: '#94a3b8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {z.isActive ? 'Pause' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteZone(z.id)}
                  style={{
                    fontSize: 11,
                    color: '#ef4444',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
