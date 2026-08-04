'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SessionUser } from '@/types';
import { GOVERNORATES } from '@/lib/governorates';

interface SellerProfile {
  storeName: string;
  description: string;
  logoUrl: string;
  bankAccount: string;
  city: string;
  governorate: string;
  pickupStreet: string;
  pickupBuilding: string;
  pickupPhone: string;
  pickupContactName: string;
  pickupGeo: string;
  pickupZone: string;
  pickupSubzone: string;
  logisticsHub: string;
}

export default function SellerSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [profile, setProfile] = useState<SellerProfile>({
    storeName: '',
    description: '',
    logoUrl: '',
    bankAccount: '',
    city: '',
    governorate: '',
    pickupStreet: '',
    pickupBuilding: '',
    pickupPhone: '',
    pickupContactName: '',
    pickupGeo: '',
    pickupZone: '',
    pickupSubzone: '',
    logisticsHub: 'المركز اللوجيستي الرئيسي',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/seller-hub/settings');
    } else if (status === 'authenticated') {
      const role = (session?.user as SessionUser)?.role;
      if (role !== 'SELLER') router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/seller/settings');
        if (res.ok) {
          const data = await res.json();
          const seller = data.seller || {};
          if (cancelled) return;
          setProfile({
            storeName: seller.storeName || '',
            description: seller.description || '',
            logoUrl: seller.logoUrl || '',
            bankAccount: seller.bankAccount || '',
            city: seller.city || '',
            governorate: seller.governorate || '',
            pickupStreet: seller.pickupStreet || '',
            pickupBuilding: seller.pickupBuilding || '',
            pickupPhone: seller.pickupPhone || '',
            pickupContactName: seller.pickupContactName || '',
            pickupGeo: seller.pickupGeo || '',
            pickupZone: seller.pickupZone || '',
            pickupSubzone: seller.pickupSubzone || '',
            logisticsHub: seller.logisticsHub || 'المركز اللوجيستي الرئيسي',
          });
        } else if (res.status !== 401 && res.status !== 403) {
          const d = await res.json().catch(() => ({}));
          setMessage({ type: 'error', text: d.message || 'Failed to load settings' });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setMessage({ type: 'error', text: 'Could not load settings' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (status === 'authenticated') fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seller/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to save settings' });
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully.' });
        if (data.seller) {
          setProfile(p => ({
            ...p,
            storeName: data.seller.storeName ?? p.storeName,
            description: data.seller.description ?? p.description,
            logoUrl: data.seller.logoUrl ?? p.logoUrl,
            bankAccount: data.seller.bankAccount ?? p.bankAccount,
            city: data.seller.city ?? p.city,
            governorate: data.seller.governorate ?? p.governorate,
            pickupStreet: data.seller.pickupStreet ?? p.pickupStreet,
            pickupBuilding: data.seller.pickupBuilding ?? p.pickupBuilding,
            pickupPhone: data.seller.pickupPhone ?? p.pickupPhone,
            pickupContactName: data.seller.pickupContactName ?? p.pickupContactName,
            pickupGeo: data.seller.pickupGeo ?? p.pickupGeo,
            pickupZone: data.seller.pickupZone ?? p.pickupZone,
            pickupSubzone: data.seller.pickupSubzone ?? p.pickupSubzone,
            logisticsHub: data.seller.logisticsHub ?? p.logisticsHub,
          }));
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { compressImage } = await import('@/lib/compress-image');
      const uploadFile = await compressImage(file, { maxDimension: 800 });
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setMessage({ type: 'error', text: data.message || 'Upload failed' });
        return;
      }
      if (data.url.startsWith('data:') && data.url.length > 700 * 1024) {
        setMessage({
          type: 'error',
          text: 'Logo is too large after compression. Pick a smaller image.',
        });
        return;
      }
      setProfile(p => ({ ...p, logoUrl: data.url }));
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="db">
        <div className="main flex items-center justify-center min-h-screen">Loading…</div>
      </div>
    );
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">SellerHub</div>

        <Link href="/" className="home-link">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Back to Shop
        </Link>
        <Link href="/seller-hub" className="nav-item">
          Overview
        </Link>
        <Link href="/seller-hub" className="nav-item">
          Orders
        </Link>
        <Link href="/seller-hub" className="nav-item">
          Products
        </Link>
        <Link href="/seller-hub/returns" className="nav-item">
          Returns
        </Link>
        <Link href="/seller-hub/settings" className="nav-item active">
          Settings
        </Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">Store Settings</div>
        </div>

        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          <div className="card">
            <h3 className="card-title mb-4">Store Information</h3>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                {profile.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-400 text-xs">Logo</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Store Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="text-xs"
                />
                {uploading && <div className="text-[10px] text-slate-400 mt-1">Uploading…</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={profile.storeName}
                  onChange={e => setProfile({ ...profile, storeName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
          <div className="card">
            <h3 className="card-title mb-2">📍 Product Pickup & Warehouse Address</h3>
            <p className="text-xs text-slate-500 mb-4">
              Shipping couriers dispatch drivers to this address to collect orders for buyer delivery.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Pickup Governorate *
                </label>
                <select
                  value={profile.governorate}
                  onChange={e => setProfile({ ...profile, governorate: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Governorate</option>
                  {GOVERNORATES.map(g => (
                    <option key={g.value} value={g.en}>
                      {g.en} ({g.ar})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Pickup City / Area *
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={e => setProfile({ ...profile, city: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Nasr City, Maadi, Dokki"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Detailed Street Address *
                </label>
                <input
                  type="text"
                  value={profile.pickupStreet}
                  onChange={e => setProfile({ ...profile, pickupStreet: e.target.value })}
                  className="input-field"
                  placeholder="Street name, Building number, Floor & Flat number"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Building / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={profile.pickupBuilding}
                  onChange={e => setProfile({ ...profile, pickupBuilding: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Near Ahly Club"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Pickup Contact Phone *
                </label>
                <input
                  type="text"
                  value={profile.pickupPhone}
                  onChange={e => setProfile({ ...profile, pickupPhone: e.target.value })}
                  className="input-field"
                  placeholder="+2010XXXXXXXX"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Pickup Contact Person Name (Optional)
                </label>
                <input
                  type="text"
                  value={profile.pickupContactName}
                  onChange={e => setProfile({ ...profile, pickupContactName: e.target.value })}
                  className="input-field"
                  placeholder="Name of person responsible for handover"
                />
              </div>

              {/* Geolocation & Map Pinning */}
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700">
                    🗺️ Warehouse Geolocation Coordinates (Latitude, Longitude)
                  </label>
                  <button
                    type="button"
                    disabled={gettingLocation}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert('Geolocation is not supported by your browser.');
                        return;
                      }
                      setGettingLocation(true);
                      navigator.geolocation.getCurrentPosition(
                        pos => {
                          setGettingLocation(false);
                          setProfile(p => ({
                            ...p,
                            pickupGeo: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
                          }));
                        },
                        err => {
                          setGettingLocation(false);
                          alert('Could not detect location: ' + err.message);
                        },
                        { enableHighAccuracy: true }
                      );
                    }}
                    className="px-3 py-1.5 bg-[#1e3b8a] text-white text-xs font-bold rounded-lg hover:bg-[#152c6e] disabled:opacity-50 transition-colors"
                  >
                    {gettingLocation ? 'Detecting GPS...' : '📍 Detect Live GPS Location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Coordinates (Lat, Long)</label>
                    <input
                      type="text"
                      value={profile.pickupGeo}
                      onChange={e => setProfile({ ...profile, pickupGeo: e.target.value })}
                      className="input-field font-mono text-xs"
                      placeholder="e.g. 30.067807, 31.518141"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">District / Zone</label>
                    <input
                      type="text"
                      value={profile.pickupZone}
                      onChange={e => setProfile({ ...profile, pickupZone: e.target.value })}
                      className="input-field text-xs"
                      placeholder="e.g. قسم اول القاهرة الجديدة"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Store Description
                </label>
                <textarea
                  value={profile.description}
                  onChange={e => setProfile({ ...profile, description: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder="Tell customers about your store..."
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Bank Account (Payouts)</h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                IBAN / Account
              </label>
              <input
                type="text"
                value={profile.bankAccount}
                onChange={e => setProfile({ ...profile, bankAccount: e.target.value })}
                className="input-field"
                placeholder="EG00 0000 0000 0000 0000 0000"
              />
              <p className="text-xs text-slate-400 mt-1">
                Payouts are processed within 5-7 business days.
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`px-4 py-3 rounded-xl text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-[#1e3b8a] text-white rounded-lg font-bold hover:bg-[#152c6e] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .db {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }
        .sidebar {
          width: 200px;
          flex-shrink: 0;
          background: linear-gradient(180deg, #1e3b8a 0%, #152c6e 100%);
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          max-height: 100vh;
          position: sticky;
          top: 0;
          align-self: flex-start;
          overflow-y: auto;
        }
        .logo {
          padding: 0 16px 20px;
          font-size: 17px;
          font-weight: 700;
          color: #fff;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }
        .nav-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-item.active {
          color: #fff;
          background: rgba(245, 158, 11, 0.12);
          border-left-color: #f59e0b;
          font-weight: 600;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 24px 32px;
          min-height: 100vh;
          padding-bottom: 80px;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .page-title {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 24px;
        }
        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }
        .input-field {
          width: 100%;
          border: 1px solid #e2e8f0;
          padding: 11px 13px;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          background: #fff;
          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }
        .input-field:focus {
          border-color: #1e3b8a;
          box-shadow: 0 0 0 3px rgba(30, 59, 138, 0.1);
        }
        @media (max-width: 768px) {
          .db {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            min-height: auto;
            max-height: none;
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
            padding: 8px;
          }
          .main {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
