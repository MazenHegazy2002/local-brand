'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GOVERNORATES, Governorate } from '@/lib/governorates';
import { SHIPPING_RATES, DEFAULT_SHIPPING_RATE } from '@/lib/shipping-rates';
import { useConfirm } from '@/providers/ConfirmProvider';

interface ShippingZone {
  id: string;
  name: string;
  governorates: string; // JSON string of string[] e.g. '["Cairo"]'
  rateEgp: number;
  defaultCourier: string | null;
  estDaysMin: number | null;
  estDaysMax: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function ShippingTab() {
  const { confirm } = useConfirm();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGov, setEditingGov] = useState<Governorate | null>(null);

  // Edit form state
  const [rateInput, setRateInput] = useState<string>('');
  const [courierInput, setCourierInput] = useState<string>('');
  const [daysMinInput, setDaysMinInput] = useState<string>('');
  const [daysMaxInput, setDaysMaxInput] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shipping');
      const data = await res.json();
      setZones(data.zones ?? []);
    } catch (e) {
      console.error('Failed to load shipping configurations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Find dynamic custom config in database for a specific governorate
  const getCustomConfig = useCallback(
    (govValue: string): ShippingZone | null => {
      const key = govValue.toLowerCase().trim();
      for (const z of zones) {
        try {
          const list = JSON.parse(z.governorates);
          if (Array.isArray(list) && list.map(g => g.toLowerCase().trim()).includes(key)) {
            return z;
          }
        } catch {
          // tolerate corrupt JSON
        }
      }
      return null;
    },
    [zones]
  );

  function startEditing(gov: Governorate) {
    const custom = getCustomConfig(gov.value);
    const key = gov.value.toLowerCase().trim();
    const defaultRate = SHIPPING_RATES[key] ?? DEFAULT_SHIPPING_RATE;

    setEditingGov(gov);
    setRateInput(custom ? String(custom.rateEgp) : String(defaultRate));
    setCourierInput(custom?.defaultCourier ?? 'Aramex Egypt');
    setDaysMinInput(custom?.estDaysMin ? String(custom.estDaysMin) : '2');
    setDaysMaxInput(custom?.estDaysMax ? String(custom.estDaysMax) : '4');
    setMsg('');
    setError('');
  }

  async function save() {
    if (!editingGov) return;
    setSaving(true);
    setMsg('');
    setError('');

    try {
      const custom = getCustomConfig(editingGov.value);
      const rate = parseFloat(rateInput);
      if (isNaN(rate) || rate < 0) {
        throw new Error('Please enter a valid shipping rate.');
      }

      const payload = {
        name: editingGov.en,
        governorates: [editingGov.value],
        rateEgp: rate,
        defaultCourier: courierInput.trim() || null,
        estDaysMin: daysMinInput ? parseInt(daysMinInput) : null,
        estDaysMax: daysMaxInput ? parseInt(daysMaxInput) : null,
        isActive: true,
      };

      if (custom) {
        // Update existing custom rate
        const res = await fetch(`/api/admin/shipping/${custom.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update shipping rate.');
      } else {
        // Create new custom rate
        const res = await fetch('/api/admin/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save shipping rate.');
      }

      setMsg(`Successfully saved shipping rate for ${editingGov.en}!`);
      setEditingGov(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault(gov: Governorate) {
    const custom = getCustomConfig(gov.value);
    if (!custom) return;

    const confirmed = await confirm({
      title: 'Reset Shipping Rate',
      message: `Reset ${gov.en} shipping rate back to global default?`,
      type: 'warning',
    });
    if (!confirmed) return;

    setSaving(true);
    setMsg('');
    setError('');

    try {
      const res = await fetch(`/api/admin/shipping/${custom.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to reset rate.');

      setMsg(`Reset ${gov.en} to global default rate.`);
      setEditingGov(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to reset rate.');
    } finally {
      setSaving(false);
    }
  }

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '460px',
    maxWidth: '90%',
    padding: '24px',
    boxSizing: 'border-box',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: '6px',
    transition: 'border-color 0.2s',
  };

  const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '10px 20px',
    backgroundColor: bg,
    color: color,
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  });

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
          Governorate Shipping Rates (أسعار شحن المحافظات)
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: 1.5 }}>
          Manage exact shipping fees individually across all 27 Egyptian governorates. Customized
          governorates override the hardcoded fallback rates during cart calculation and checkout.
        </p>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 16px',
            background: '#ecfdf5',
            border: '1px solid #d1fae5',
            color: '#065f46',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          {msg}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Loading governorate configurations…
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
              padding: '14px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span>Governorate / المحافظة</span>
            <span>Rate (EGP)</span>
            <span>Source</span>
            <span>Courier & Transit</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {GOVERNORATES.map(gov => {
              const custom = getCustomConfig(gov.value);
              const key = gov.value.toLowerCase().trim();
              const defaultRate = SHIPPING_RATES[key] ?? DEFAULT_SHIPPING_RATE;
              const activeRate = custom ? Number(custom.rateEgp) : defaultRate;

              return (
                <div
                  key={gov.value}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
                    padding: '14px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    fontSize: '13px',
                    transition: 'background-color 0.15s',
                  }}
                  className="hover:bg-slate-50"
                >
                  {/* Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{gov.en}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'Cairo' }}>
                      {gov.ar}
                    </span>
                  </div>

                  {/* Rate */}
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    {activeRate.toLocaleString()} EGP
                  </span>

                  {/* Source */}
                  <div>
                    {custom ? (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '20px',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        Custom Rate
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '20px',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>

                  {/* Courier & Transit */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      fontSize: '12px',
                      color: '#64748b',
                    }}
                  >
                    <span>{custom?.defaultCourier ?? 'Aramex Egypt'}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {custom?.estDaysMin && custom?.estDaysMax
                        ? `${custom.estDaysMin}-${custom.estDaysMax} days`
                        : gov.value === 'Cairo' ||
                            gov.value === 'Giza' ||
                            gov.value === 'Alexandria'
                          ? '1-2 days'
                          : '3-5 days'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => startEditing(gov)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4f46e5',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      className="hover:underline"
                    >
                      Customize
                    </button>
                    {custom && (
                      <button
                        onClick={() => resetToDefault(gov)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        className="hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editing Dialog Modal */}
      {editingGov && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Customize shipping for {editingGov.en}
              </h3>
              <button
                onClick={() => setEditingGov(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                  Shipping Price (EGP) *
                </label>
                <input
                  type="number"
                  style={inputStyle}
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  placeholder="e.g. 50"
                  min="0"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                  Preferred Courier
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={courierInput}
                  onChange={e => setCourierInput(e.target.value)}
                  placeholder="e.g. Aramex Egypt"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    Est. Transit Min (Days)
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={daysMinInput}
                    onChange={e => setDaysMinInput(e.target.value)}
                    placeholder="e.g. 2"
                    min="1"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    Est. Transit Max (Days)
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={daysMaxInput}
                    onChange={e => setDaysMaxInput(e.target.value)}
                    placeholder="e.g. 4"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}
            >
              <button
                onClick={() => setEditingGov(null)}
                style={btnStyle('transparent', '#64748b')}
                className="border hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={btnStyle('#4f46e5', '#ffffff')}
                className="hover:opacity-90"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
