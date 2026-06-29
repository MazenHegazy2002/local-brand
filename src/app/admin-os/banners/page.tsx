'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui';
import { useConfirm } from '@/providers/ConfirmProvider';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string | null;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  ctaLabel: 'Shop now',
  position: 0,
  isActive: true,
  startsAt: '',
  endsAt: '',
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (b?: Banner) => {
    if (b) {
      setEditing(b);
      setForm({
        title: b.title,
        subtitle: b.subtitle || '',
        imageUrl: b.imageUrl,
        linkUrl: b.linkUrl,
        ctaLabel: b.ctaLabel || 'Shop now',
        position: b.position,
        isActive: b.isActive,
        startsAt: b.startsAt ? b.startsAt.split('T')[0] : '',
        endsAt: b.endsAt ? b.endsAt.split('T')[0] : '',
      });
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Banners can stay slightly larger (1920 max edge) since they're hero
      // images, but still compress so phone uploads don't blow the request.
      const { compressImage } = await import('@/lib/compress-image');
      const uploadFile = await compressImage(file, { maxDimension: 1920 });
      const fd = new FormData();
      fd.append('file', uploadFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.url) {
        toast({ title: d.message || 'Banner upload failed', variant: 'error' });
        return;
      }
      if (d.url.startsWith('data:') && d.url.length > 700 * 1024) {
        toast({
          title:
            'Banner is too large after compression. Pick a smaller image, or configure Vercel Blob / Cloudinary on the server.',
          variant: 'error',
        });
        return;
      }
      setForm(f => ({ ...f, imageUrl: d.url }));
    } catch (err) {
      console.error('Banner upload failed:', err);
      toast({ title: (err as Error).message || 'Banner upload failed', variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      position: Number(form.position),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    };
    const url = editing ? `/api/admin/banners/${editing.id}` : '/api/admin/banners';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } else {
      const d = await res.json();
      toast({ title: d.message || 'Failed to save banner', variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Banner',
      message: 'Delete this banner? This cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    await load();
  };

  const toggleActive = async (banner: Banner) => {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    await load();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin-os" className="text-xs text-slate-500 hover:underline">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-black text-slate-900 mt-1">Homepage Banners</h1>
            <p className="text-sm text-slate-500">
              Schedule promotional banners for the homepage carousel.
            </p>
          </div>
          <button
            onClick={() => openForm()}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800"
          >
            + New Banner
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading banners…</div>
        ) : banners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center text-slate-400">
            No banners yet. Create your first one to feature a campaign on the homepage.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map(banner => (
              <div
                key={banner.id}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              >
                <div className="aspect-[16/9] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-black text-slate-900 text-sm">{banner.title}</h3>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        banner.isActive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {banner.subtitle && (
                    <div className="text-xs text-slate-500 mb-2 line-clamp-1">
                      {banner.subtitle}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mb-3">
                    Position #{banner.position} · Links to{' '}
                    <code className="font-mono">{banner.linkUrl}</code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openForm(banner)}
                      className="flex-1 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(banner)}
                      className="flex-1 px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                    >
                      {banner.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                      aria-label="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-black mb-4">{editing ? 'Edit Banner' : 'New Banner'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Title
                </label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Image
                </label>
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="text-xs"
                />
                {uploading && <div className="text-[10px] text-slate-400 mt-1">Uploading…</div>}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Link URL
                </label>
                <input
                  required
                  type="text"
                  placeholder="/shop or https://…"
                  value={form.linkUrl}
                  onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    CTA Label
                  </label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={e => setForm({ ...form, ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Position / Slot (0 = Slider, 1 = Top Right, 2 = Bottom Right)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.position}
                    onChange={e => setForm({ ...form, position: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Starts
                  </label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={e => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Ends
                  </label>
                  <input
                    type="date"
                    value={form.endsAt}
                    onChange={e => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm"
                >
                  {editing ? 'Save changes' : 'Create banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
