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
}

export default function SellerSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<SellerProfile>({
    storeName: '',
    description: '',
    logoUrl: '',
    bankAccount: '',
    city: '',
    governorate: '',
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
          setProfile((p) => ({
            ...p,
            storeName: data.seller.storeName ?? p.storeName,
            description: data.seller.description ?? p.description,
            logoUrl: data.seller.logoUrl ?? p.logoUrl,
            bankAccount: data.seller.bankAccount ?? p.bankAccount,
            city: data.seller.city ?? p.city,
            governorate: data.seller.governorate ?? p.governorate,
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
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setProfile((p) => ({ ...p, logoUrl: data.url }));
      } else {
        setMessage({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
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
        <Link href="/seller-hub" className="nav-item">Overview</Link>
        <Link href="/seller-hub" className="nav-item">Orders</Link>
        <Link href="/seller-hub" className="nav-item">Products</Link>
        <Link href="/seller-hub/returns" className="nav-item">Returns</Link>
        <Link href="/seller-hub/settings" className="nav-item active">Settings</Link>
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
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="text-xs" />
                {uploading && <div className="text-[10px] text-slate-400 mt-1">Uploading…</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Store Name *</label>
                <input
                  type="text"
                  value={profile.storeName}
                  onChange={(e) => setProfile({ ...profile, storeName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="input-field"
                  placeholder="e.g. New Cairo, Maadi"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Governorate</label>
                <select
                  value={profile.governorate}
                  onChange={(e) => setProfile({ ...profile, governorate: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Governorate</option>
                  {GOVERNORATES.map((g) => (
                    <option key={g.value} value={g.value}>{g.en}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Store Description</label>
                <textarea
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
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
              <label className="block text-xs font-medium text-slate-500 mb-1">IBAN / Account</label>
              <input
                type="text"
                value={profile.bankAccount}
                onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })}
                className="input-field"
                placeholder="EG00 0000 0000 0000 0000 0000"
              />
              <p className="text-xs text-slate-400 mt-1">Payouts are processed within 5-7 business days.</p>
            </div>
          </div>

          {message && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>{message.text}</div>
          )}

          <button type="submit" disabled={saving} className="w-full py-4 bg-[#1e3b8a] text-white rounded-lg font-bold hover:bg-[#152c6e] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .db { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .sidebar { width: 200px; flex-shrink: 0; background: linear-gradient(180deg, #1e3b8a 0%, #152c6e 100%); padding: 16px 0; display: flex; flex-direction: column; min-height: 100vh; max-height: 100vh; position: sticky; top: 0; align-self: flex-start; overflow-y: auto; }
        .logo { padding: 0 16px 20px; font-size: 17px; font-weight: 700; color: #fff; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); transition: all 0.2s; border-left: 3px solid transparent; }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-item.active { color: #fff; background: rgba(245,158,11,0.12); border-left-color: #f59e0b; font-weight: 600; }
        .main { flex: 1; min-width: 0; padding: 24px 32px; min-height: 100vh; padding-bottom: 80px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 20px; font-weight: 600; color: #1e293b; }
        .card { background: #fff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); padding: 24px; }
        .card-title { font-size: 14px; font-weight: 600; color: #1e293b; }
        .input-field { width: 100%; border: 1px solid #e2e8f0; padding: 11px 13px; border-radius: 8px; font-size: 13px; outline: none; background: #fff; transition: border-color .15s, box-shadow .15s; }
        .input-field:focus { border-color: #1e3b8a; box-shadow: 0 0 0 3px rgba(30,59,138,.1); }
        @media (max-width: 768px) { .db { flex-direction: column; } .sidebar { width: 100%; min-height: auto; max-height: none; position: static; flex-direction: row; flex-wrap: wrap; padding: 8px; } .main { padding: 16px; } }
      `}</style>
    </div>
  );
}
