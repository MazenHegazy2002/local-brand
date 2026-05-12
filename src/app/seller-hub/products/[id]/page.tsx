'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SessionUser } from '@/types';

interface Product {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  category: { id: string; name: string };
  categoryId: string;
  condition: string;
  weightGrams: number;
  images: { url: string; isPrimary: boolean }[];
  variants: { id: string; title: string; stockCount: number; price: number; color: string }[];
  tags: { name: string }[];
  flashSalePrice: number | null;
  flashSaleEndsAt: string | null;
  flashSaleLimit: number | null;
  published: boolean;
}

interface LocalVariant {
  id?: string;
  title: string;
  stockCount: number;
  price: number;
  color: string;
  image?: string;
}

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    basePrice: 0,
    categoryId: '',
    condition: 'NEW',
    weightGrams: 0,
    flashSalePrice: null as number | null,
    flashSaleEndsAt: '',
    flashSaleLimit: null as number | null,
    published: true,
  });
  const [variants, setVariants] = useState<LocalVariant[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/seller-hub');
    } else if (status === 'authenticated') {
      const role = (session?.user as SessionUser)?.role;
      if (role !== 'SELLER') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        setForm({
          title: data.title || '',
          description: data.description || '',
          basePrice: data.basePrice || 0,
          categoryId: data.categoryId || '',
          condition: data.condition || 'NEW',
          weightGrams: data.weightGrams || 0,
          flashSalePrice: data.flashSalePrice || null,
          flashSaleEndsAt: data.flashSaleEndsAt ? data.flashSaleEndsAt.split('T')[0] : '',
          flashSaleLimit: data.flashSaleLimit || null,
          published: data.published ?? true,
        });
        setVariants(
          data.variants?.map(
            (v: {
              id: string;
              title?: string;
              stockCount?: number;
              price?: number;
              color?: string;
            }) => ({
              id: v.id,
              title: v.title || '',
              stockCount: v.stockCount || 0,
              price: v.price || data.basePrice,
              color: v.color || '',
            })
          ) || []
        );
        setTags(data.tags?.map((t: { name: string }) => t.name) || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress phone-camera photos so the resulting URL stays small
      // enough to round-trip through the product update server action.
      const { compressImage } = await import('@/lib/compress-image');
      const uploadFile = await compressImage(file);

      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Upload failed');
      }
      if (data.url.startsWith('data:') && data.url.length > 700 * 1024) {
        throw new Error('Image is too large after compression. Pick a smaller photo.');
      }
      const updated = [...variants];
      updated[index].image = data.url;
      setVariants(updated);
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Upload failed.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          flashSaleEndsAt: form.flashSaleEndsAt
            ? new Date(form.flashSaleEndsAt).toISOString()
            : null,
          variants: variants,
        }),
      });
      if (res.ok) {
        router.push('/seller-hub');
      } else {
        alert('Failed to update product');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/seller-hub');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { title: '', stockCount: 0, price: form.basePrice, color: '' }]);
  };

  const updateVariant = (index: number, field: keyof LocalVariant, value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value } as LocalVariant;
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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
        <div className="logo">SellerHub</div>
        <Link href="/seller-hub" className="nav-item">
          Overview
        </Link>
        <Link href="/seller-hub/orders" className="nav-item">
          Orders
        </Link>
        <Link href="/seller-hub/products" className="nav-item active">
          Products
        </Link>
        <Link href="/seller-hub/returns" className="nav-item">
          Returns
        </Link>
        <Link href="/seller-hub/settings" className="nav-item">
          Settings
        </Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">Edit Product</div>
          <div className="flex gap-3">
            <Link href="/seller-hub" className="px-4 py-2 border border-slate-200 rounded text-sm">
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0F6E56] text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="card-title mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                    className="input-field bg-white"
                  >
                    <option value="">Select...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Condition</label>
                  <select
                    value={form.condition}
                    onChange={e => setForm({ ...form, condition: e.target.value })}
                    className="input-field bg-white"
                  >
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="USED">Used</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Base Price (EGP) *
                  </label>
                  <input
                    type="number"
                    value={form.basePrice}
                    onChange={e => setForm({ ...form, basePrice: Number(e.target.value) })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    value={form.weightGrams}
                    onChange={e => setForm({ ...form, weightGrams: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="input-field"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">Variants & Stock</h3>
                <button
                  onClick={addVariant}
                  type="button"
                  className="text-xs text-[#0F6E56] font-bold"
                >
                  + ADD VARIANT
                </button>
              </div>
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Variant</label>
                        <input
                          type="text"
                          value={v.title}
                          onChange={e => updateVariant(i, 'title', e.target.value)}
                          className="input-field py-1"
                          placeholder="e.g. Large / Blue"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Stock</label>
                        <input
                          type="number"
                          value={v.stockCount}
                          onChange={e => updateVariant(i, 'stockCount', Number(e.target.value))}
                          className="input-field py-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Price</label>
                        <input
                          type="number"
                          value={v.price}
                          onChange={e => updateVariant(i, 'price', Number(e.target.value))}
                          className="input-field py-1"
                        />
                      </div>
                    </div>
                    {variants.length > 1 && (
                      <button
                        onClick={() => removeVariant(i)}
                        className="text-red-400 text-xs mt-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title mb-4">Flash Sale Settings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Flash Price
                  </label>
                  <input
                    type="number"
                    value={form.flashSalePrice || ''}
                    onChange={e =>
                      setForm({
                        ...form,
                        flashSalePrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="input-field"
                    placeholder="Sale price"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.flashSaleEndsAt}
                    onChange={e => setForm({ ...form, flashSaleEndsAt: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Limit</label>
                  <input
                    type="number"
                    value={form.flashSaleLimit || ''}
                    onChange={e =>
                      setForm({
                        ...form,
                        flashSaleLimit: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="input-field"
                    placeholder="Max qty"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="input-field"
                  placeholder="Add tag..."
                />
                <button onClick={addTag} className="px-4 bg-slate-100 rounded">
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="card-title mb-4">Preview</h3>
              <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden mb-3">
                {product?.images?.[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={form.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No image
                  </div>
                )}
              </div>
              <h4 className="font-bold text-sm">{form.title || 'Product Title'}</h4>
              <p className="text-[#0F6E56] font-black">{form.basePrice} EGP</p>
              {form.flashSalePrice && (
                <p className="text-red-500 text-sm">{form.flashSalePrice} EGP Sale!</p>
              )}
            </div>

            <div className="card">
              <h3 className="card-title mb-4">Status</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => setForm({ ...form, published: e.target.checked })}
                  className="rounded border-slate-300 text-[#0F6E56]"
                />
                <span className="text-sm text-slate-700">Published</span>
              </label>
            </div>

            <div className="card">
              <h3 className="card-title mb-4 text-red-600">Danger Zone</h3>
              <button
                onClick={handleDelete}
                className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      </div>

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
          background: #0f6e56;
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
          font-size: 17px;
          font-weight: 500;
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
        }
        .nav-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-item.active {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          font-weight: 500;
        }
        .main {
          flex: 1;
          min-width: 0;
          padding: 24px 32px;
          overflow: auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .page-title {
          font-size: 20px;
          font-weight: 500;
          color: #1e293b;
        }
        .card {
          background: #fff;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 20px;
        }
        .card-title {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
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
          border-color: #0f6e56;
        }
      `}</style>
    </div>
  );
}
