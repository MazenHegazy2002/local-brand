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
  variants: {
    id: string;
    title: string;
    stockCount: number;
    price: number;
    color: string;
    attributes: string;
    sku?: string;
    upc?: string;
  }[];
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
  sizes?: string;
  sku?: string;
  upc?: string;
  uploading?: boolean;
}

const CATALOG_COLORS: { name: string; rgb: [number, number, number] }[] = [
  { name: 'Black', rgb: [0, 0, 0] },
  { name: 'White', rgb: [255, 255, 255] },
  { name: 'Red', rgb: [255, 0, 0] },
  { name: 'Blue', rgb: [0, 0, 255] },
  { name: 'Green', rgb: [0, 128, 0] },
  { name: 'Yellow', rgb: [255, 255, 0] },
  { name: 'Pink', rgb: [255, 192, 203] },
  { name: 'Purple', rgb: [128, 0, 128] },
  { name: 'Orange', rgb: [255, 165, 0] },
  { name: 'Gray', rgb: [128, 128, 128] },
  { name: 'Brown', rgb: [165, 42, 42] },
  { name: 'Beige', rgb: [245, 245, 220] },
  { name: 'Navy', rgb: [0, 0, 128] },
  { name: 'Teal', rgb: [0, 128, 128] },
];

const detectImageColor = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  for (const color of CATALOG_COLORS) {
    if (fileName.includes(color.name.toLowerCase())) {
      return color.name;
    }
  }

  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 10;
          canvas.height = 10;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('Default');
            return;
          }
          ctx.drawImage(img, 0, 0, 10, 10);
          const imgData = ctx.getImageData(0, 0, 10, 10).data;

          let totalR = 0,
            totalG = 0,
            totalB = 0,
            count = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];

            if (a > 128) {
              totalR += r;
              totalG += g;
              totalB += b;
              count++;
            }
          }

          if (count === 0) {
            resolve('Default');
            return;
          }

          const avgR = totalR / count;
          const avgG = totalG / count;
          const avgB = totalB / count;

          let bestColor = 'Default';
          let minDistance = Infinity;

          for (const color of CATALOG_COLORS) {
            const [cr, cg, cb] = color.rgb;
            const dist = Math.sqrt(
              Math.pow(avgR - cr, 2) + Math.pow(avgG - cg, 2) + Math.pow(avgB - cb, 2)
            );
            if (dist < minDistance) {
              minDistance = dist;
              bestColor = color.name;
            }
          }

          resolve(bestColor);
        } catch (err) {
          console.error('Error analyzing image color:', err);
          resolve('Default');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
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
      loadCategories();
    }
  }, [productId]);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        const list: { id: string; name: string }[] = [];
        (data.categories || []).forEach((c: any) => {
          list.push({ id: c.id, name: c.name });
          (c.children || []).forEach((child: any) => {
            list.push({ id: child.id, name: `${c.name} > ${child.name}` });
          });
        });
        setCategories(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
            (
              v: {
                id: string;
                title?: string;
                stockCount?: number;
                price?: number;
                color?: string;
                attributes?: string;
                sku?: string;
                upc?: string;
              },
              idx: number
            ) => {
              let parsedAttrs: any = {};
              try {
                parsedAttrs =
                  typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes || {};
              } catch (err) {
                console.error(err);
              }
              const sizesStr = Array.isArray(parsedAttrs.sizes) ? parsedAttrs.sizes.join(', ') : '';
              const imgUrl = data.images?.[idx]?.url || '';
              return {
                id: v.id,
                title: v.title || parsedAttrs.color || '',
                stockCount: v.stockCount || 0,
                price: v.price || data.basePrice,
                color: v.color || parsedAttrs.color || v.title || 'Standard',
                sizes: sizesStr,
                image: imgUrl,
                sku: v.sku || '',
                upc: v.upc || '',
              };
            }
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

    const previewUrl = URL.createObjectURL(file);
    let suggestedColor = '';
    try {
      suggestedColor = await detectImageColor(file);
    } catch (err) {
      console.error(err);
    }

    setVariants(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          image: previewUrl,
          uploading: true,
          color:
            next[index].color && next[index].color !== 'Default' && next[index].color !== ''
              ? next[index].color
              : suggestedColor || 'Default',
          title:
            next[index].title && next[index].title !== 'Default' && next[index].title !== ''
              ? next[index].title
              : suggestedColor || 'Default',
        };
      }
      return next;
    });

    try {
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

      setVariants(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index] = {
            ...next[index],
            image: data.url,
            uploading: false,
          };
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      alert((e as Error).message || 'Upload failed.');
      setVariants(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index].uploading = false;
        }
        return next;
      });
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
          variants: variants.map(v => ({
            ...v,
            title: v.color || v.title || 'Standard',
            sizes: v.sizes || '',
          })),
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
    setVariants([
      ...variants,
      { title: '', stockCount: 0, price: form.basePrice, color: '', sizes: '', sku: '', upc: '' },
    ]);
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
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
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
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const priceVal = Number(form.basePrice) || 0;
                      if (priceVal > 0) {
                        setVariants(variants.map(v => ({ ...v, price: priceVal })));
                      }
                    }}
                    className="text-xs font-bold text-[#0F6E56] hover:underline"
                  >
                    Same Price for All Variants
                  </button>
                  <button
                    onClick={addVariant}
                    type="button"
                    className="text-xs text-[#0F6E56] font-bold hover:underline"
                  >
                    + ADD VARIANT
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block font-semibold">
                          Color / Variant
                        </label>
                        <input
                          type="text"
                          value={v.color || ''}
                          onChange={e => updateVariant(i, 'color', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Color"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block font-semibold">
                          Stock
                        </label>
                        <input
                          type="number"
                          value={v.stockCount}
                          onChange={e => updateVariant(i, 'stockCount', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          min="0"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block font-semibold">
                          Price
                        </label>
                        <input
                          type="number"
                          value={v.price}
                          onChange={e => updateVariant(i, 'price', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block font-semibold">
                          Image
                        </label>
                        <label
                          className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-[10px] text-slate-600 font-semibold h-[34px]"
                          title={v.image ? 'Replace image' : 'Choose image'}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          {v.image ? 'Replace' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleImageUpload(i, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="col-span-1 flex items-center justify-center pt-4">
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          disabled={variants.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30"
                          aria-label="Remove variant"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12">
                        <input
                          type="text"
                          value={v.sizes || ''}
                          onChange={e => updateVariant(i, 'sizes', e.target.value)}
                          placeholder="Sizes (CSV, e.g. S, M, L, XL)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={v.sku || ''}
                          onChange={e => updateVariant(i, 'sku', e.target.value)}
                          placeholder="SKU (auto if blank)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                          autoComplete="off"
                        />
                      </div>
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={v.upc || ''}
                          onChange={e =>
                            updateVariant(i, 'upc', e.target.value.replace(/\D/g, '').slice(0, 14))
                          }
                          placeholder="UPC / barcode (optional, 8-14 digits)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                          inputMode="numeric"
                          pattern="\d*"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {v.image && (
                      <div className="pt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={v.image}
                          alt={`Variant ${i + 1} preview`}
                          className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                        />
                        <div className="text-xs flex-1">
                          {v.uploading ? (
                            <span className="text-amber-600 font-semibold">Uploading…</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">✓ Image ready</span>
                          )}
                        </div>
                        {!v.uploading && (
                          <button
                            type="button"
                            onClick={() => updateVariant(i, 'image', '')}
                            className="text-slate-400 hover:text-red-500 text-xs font-semibold"
                          >
                            Remove Image
                          </button>
                        )}
                      </div>
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
