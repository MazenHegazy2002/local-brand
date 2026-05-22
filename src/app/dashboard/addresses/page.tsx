'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Address {
  id: string;
  street: string;
  city: string;
  governorate: string;
  postalCode: string;
  isDefault: boolean;
}

const governorates = [
  'Cairo',
  'Alexandria',
  'Giza',
  'Shubra El-Kheima',
  'Port Said',
  'Suez',
  'Mansoura',
  'Tanta',
  'Asyut',
  'Ismailia',
  'Faiyum',
  'Zagazig',
  'Aswan',
  'Damietta',
  'Dakhla',
  'Luxor',
  'New Valley',
  'Beni Suef',
  'Qena',
  'Sohag',
  'Minya',
  'Qalyubia',
  'Kafr El Sheikh',
  'Gharbia',
  'Monufia',
  'Sharqia',
  'Dakahlia',
  'Beheira',
  'Cairo',
];

export default function AddressesPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    street: '',
    city: '',
    governorate: '',
    postalCode: '',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/addresses');
    }
  }, [status, router]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      street: '',
      city: '',
      governorate: '',
      postalCode: '',
      isDefault: addresses.length === 0,
    });
    setShowModal(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingId(addr.id);
    setForm({
      street: addr.street,
      city: addr.city,
      governorate: addr.governorate,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.street || !form.city || !form.governorate) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...form,
        }),
      });
      if (res.ok) {
        await fetchAddresses();
        setShowModal(false);
      } else {
        alert('Failed to save address');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving address');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      await fetchAddresses();
    } catch (e) {
      console.error(e);
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: true }),
      });
      await fetchAddresses();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="db">
        <div className="main">Loading...</div>
      </div>
    );
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">
          My<span>LB</span>
        </div>

        <div className="nav-section">Personal</div>
        <Link href="/dashboard" className="nav-item">
          Overview
        </Link>
        <Link href="/dashboard/orders" className="nav-item">
          My Orders
        </Link>
        <Link href="/dashboard/wishlist" className="nav-item">
          Wishlist
        </Link>
        <Link href="/dashboard/notifications" className="nav-item">
          Alerts
        </Link>

        <div className="nav-section">Finance</div>
        <Link href="/dashboard/wallet" className="nav-item">
          Wallet
        </Link>

        <div className="nav-section">System</div>
        <Link href="/dashboard/settings" className="nav-item">
          Settings
        </Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">Delivery addresses</div>
          <button onClick={openAddModal} className="refresh-btn">
            + Add Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-5xl mb-4">📍</div>
            <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
            <p className="text-sm text-slate-500 mb-6">Add a delivery address to get started</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-[#534AB7] text-white rounded-lg font-medium"
            >
              Add Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
              <div
                key={addr.id}
                className={`card ${addr.isDefault ? 'border-2 border-[#534AB7]' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  {addr.isDefault && (
                    <span className="bg-[#534AB7] text-white text-[10px] font-bold px-2 py-1 rounded">
                      DEFAULT
                    </span>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(addr)}
                      className="text-xs text-[#534AB7] hover:underline"
                    >
                      Edit
                    </button>
                    {!addr.isDefault && (
                      <>
                        <button
                          onClick={() => setAsDefault(addr.id)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Set Default
                        </button>
                        <button
                          onClick={() => deleteAddress(addr.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{addr.street}</p>
                  <p className="text-slate-500">
                    {addr.city}, {addr.governorate}
                  </p>
                  {addr.postalCode && (
                    <p className="text-slate-400 text-xs">Postal: {addr.postalCode}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="card-title mb-6">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={form.street}
                  onChange={e => setForm({ ...form, street: e.target.value })}
                  className="input-field"
                  placeholder="123 Main Street, Building, Floor"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="input-field"
                    placeholder="Cairo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Governorate *
                  </label>
                  <select
                    value={form.governorate}
                    onChange={e => setForm({ ...form, governorate: e.target.value })}
                    className="input-field bg-white"
                    required
                  >
                    <option value="">Select...</option>
                    {governorates.map(g => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={e => setForm({ ...form, postalCode: e.target.value })}
                  className="input-field"
                  placeholder="12345"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-[#534AB7]"
                  />
                  <span className="text-sm text-slate-700">Set as default address</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-[#534AB7] text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .db {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }
        .sidebar {
          width: 186px;
          flex-shrink: 0;
          background: #1a1a2e;
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          max-height: 100vh;
          overflow-y: auto;
          position: sticky;
          top: 0;
          align-self: flex-start;
        }
        .logo {
          padding: 0 16px 20px;
          font-size: 15px;
          font-weight: 500;
          color: #fff;
        }
        .logo span {
          color: #7f77dd;
        }
        .nav-section {
          font-size: 10px;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.08em;
          padding: 10px 16px 4px;
          text-transform: uppercase;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          color: #888;
          transition: all 0.12s;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ccc;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 18px;
          overflow: auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: #1e293b;
        }
        .refresh-btn {
          padding: 6px 12px;
          border-radius: 6px;
          background: #534ab7;
          color: white;
          font-size: 11px;
          font-weight: 500;
          border: none;
          cursor: pointer;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 20px;
        }
        .input-field {
          width: 100%;
          border: 1px solid #e2e8f0;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
        }
        .input-field:focus {
          border-color: #534ab7;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          width: 100%;
          max-width: 500px;
          padding: 32px;
          border-radius: 16px;
        }
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
}
