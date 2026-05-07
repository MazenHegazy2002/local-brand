'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SellerProfile {
  storeName: string;
  description: string;
  logo: string;
  bankAccount: string;
  phone: string;
  email: string;
}

export default function SellerSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SellerProfile>({
    storeName: '',
    description: '',
    logo: '',
    bankAccount: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/seller-hub');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'SELLER') router.push('/dashboard');
    }
  }, [status, session, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/seller/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setProfile({ ...profile, logo: data.url });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="db"><div className="main">Loading...</div></div>;
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">SellerHub</div>
        <Link href="/seller-hub" className="nav-item">Overview</Link>
        <Link href="/seller-hub/orders" className="nav-item">Orders</Link>
        <Link href="/seller-hub/products" className="nav-item">Products</Link>
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
              <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                {profile.logo ? (
                  <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Logo</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Store Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Store Name *</label>
                <input
                  type="text"
                  value={profile.storeName}
                  onChange={e => setProfile({ ...profile, storeName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="input-field"
                  placeholder="+20 1XX XXX XXXX"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Store Description</label>
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
              <label className="block text-xs font-medium text-slate-500 mb-1">IBAN</label>
              <input
                type="text"
                value={profile.bankAccount}
                onChange={e => setProfile({ ...profile, bankAccount: e.target.value })}
                className="input-field"
                placeholder="EG00 0000 0000 0000 0000 0000"
              />
              <p className="text-xs text-slate-400 mt-1">Payouts are processed within 5-7 business days</p>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-4 bg-[#0F6E56] text-white rounded-lg font-bold hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .db { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .sidebar { width: 186px; flex-shrink: 0; background: #0F6E56; padding: 16px 0; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
        .logo { padding: 0 16px 20px; font-size: 17px; font-weight: 500; color: #fff; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); transition: all 0.2s; }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-item.active { color: #fff; background: rgba(255,255,255,0.1); font-weight: 500; }
        .main { flex: 1; min-width: 0; padding: 24px 32px; overflow: auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 20px; font-weight: 500; color: #1e293b; }
        .card { background: #fff; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); padding: 24px; }
        .card-title { font-size: 14px; font-weight: 600; color: #1e293b; }
        .input-field { width: 100%; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 13px; outline: none; }
        .input-field:focus { border-color: #0F6E56; }
      `}</style>
    </div>
  );
}