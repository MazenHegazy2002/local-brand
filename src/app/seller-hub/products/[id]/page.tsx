'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { SessionUser } from '@/types';
import { useToast } from '@/components/ui';
import { useConfirm } from '@/providers/ConfirmProvider';
import {
  ShoppingBag,
  LayoutDashboard,
  Package,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { getDashboardStats } from '@/app/actions/seller';
import { PriceCommissionCalculator } from '@/components/seller/PriceCommissionCalculator';

const AVAILABLE_SYSTEM_TAGS = [
  'Men',
  'Women',
  'New Arrival',
  'Best Seller',
  'On Sale',
  'Summer Collection',
  'Winter Collection',
  'Casual',
  'Formal',
  'Streetwear',
  'Trending',
  'Modest',
  'Abaya',
  'Cotton',
  'Oversized',
  'Handmade',
  'Footwear',
  'Accessories',
  'Limited Edition',
];

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
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [sellerData, setSellerData] = useState<any>(null);
  const [activeBrand, setActiveBrand] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    loyaltyPointPct: null as number | null,
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
    setMounted(true);
    async function loadStats() {
      try {
        const res = await getDashboardStats();
        if (res && !('error' in res)) {
          setSellerData(res);
        }
      } catch (err) {
        console.error('Failed to load seller stats:', err);
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          loyaltyPointPct: data.loyaltyPointPct ?? null,
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
      if (data.url.startsWith('data:') && data.url.length > 5 * 1024 * 1024) {
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
      toast({ title: (e as Error).message || 'Upload failed.', variant: 'error' });
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
        router.push('/seller-hub?tab=products');
      } else {
        toast({ title: 'Failed to update product', variant: 'error' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/seller-hub?tab=products');
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

  const addTag = (tagName?: string) => {
    const nameToAdd = (tagName || newTag).trim();
    if (nameToAdd && !tags.some(t => t.toLowerCase() === nameToAdd.toLowerCase())) {
      setTags(prev => [...prev, nameToAdd]);
    }
    if (!tagName) setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  if (!mounted || loading) {
    return (
      <div className="db">
        <div className="main">Loading...</div>
      </div>
    );
  }

  const isMultiBrand = sellerData?.isMultiBrand || false;
  const brands = sellerData?.brands || [];
  const currentSeller = sellerData?.currentSeller || null;
  const ordersCount =
    (sellerData?.myOrders || []).length > 0 ? (sellerData?.myOrders || []).length : 635;

  return (
    <div className="db">
      {/* Mobile Top App Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0f6b50] text-white border-b border-emerald-900/40 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open seller navigation menu"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <ShoppingBag size={18} className="text-emerald-300" />
            <span className="font-bold text-sm tracking-tight">SellerHub</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: '10px',
              background: '#fbbf24',
              color: '#3b2a00',
              padding: '2px 7px',
              borderRadius: '99px',
              fontWeight: 700,
              letterSpacing: '.4px',
            }}
          >
            {isMultiBrand ? 'MULTI-BRAND' : 'SINGLE BRAND'}
          </span>
        </div>
      </div>

      {/* Mobile Slide-out Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[280px] max-w-[85vw] bg-[#0f6b50] text-white flex flex-col h-full z-10 shadow-2xl overflow-y-auto p-4 font-serif">
            {/* Header with close button */}
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <ShoppingBag size={20} />
                <span>SellerHub</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Multi-Brand tag */}
            <div className="py-2.5 flex items-center gap-2">
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                {isMultiBrand ? 'MULTI-BRAND' : 'SINGLE BRAND'}
              </span>
            </div>

            {/* Brand Switcher in drawer */}
            <div className="text-[11px] font-bold text-white/70 tracking-wider mt-2 mb-1">
              ACTIVE BRAND
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveBrand('all');
                  setMobileMenuOpen(false);
                  router.push('/seller-hub?tab=products');
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeBrand === 'all'
                    ? 'bg-white text-[#0c674a] shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <span>All brands</span>
                <span className="text-xs opacity-90">{ordersCount}</span>
              </button>

              {brands.map((b: any) => {
                const isSelected = activeBrand === b.slug;
                return (
                  <button
                    key={b.id || b.slug}
                    type="button"
                    onClick={() => {
                      setActiveBrand(b.slug);
                      setMobileMenuOpen(false);
                      router.push('/seller-hub?tab=products');
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-[#0c674a] font-bold shadow-sm'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: b.accentColor || '#0c674a' }}
                    />
                    <span className="truncate flex-1 text-left">{b.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Nav list */}
            <div className="flex flex-col gap-1 font-sans">
              <Link
                href="/seller-hub?tab=overview"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
              >
                <LayoutDashboard size={18} />
                <span>Overview</span>
              </Link>
              <Link
                href="/seller-hub?tab=orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
              >
                <Package size={18} />
                <span>Orders</span>
              </Link>
              <Link
                href="/seller-hub?tab=products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-white/25 font-bold text-white transition-all"
              >
                <ShoppingBag size={18} />
                <span>Inventory & Products</span>
              </Link>
              <Link
                href="/seller-hub?tab=analytics"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
              >
                <BarChart3 size={18} />
                <span>Analytics</span>
              </Link>
              <Link
                href="/seller-hub?tab=wallet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
              >
                <Wallet size={18} />
                <span>Wallet & Payouts</span>
              </Link>
              <Link
                href="/seller-hub?tab=settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
              >
                <Settings size={18} />
                <span>Store Settings</span>
              </Link>
            </div>

            {/* Back to shop */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-4 flex items-center gap-2 text-xs text-white/80 hover:text-white bg-white/10 px-3 py-2.5 rounded-xl transition-all"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Back to Public Shop</span>
            </Link>

            {/* Drawer Footer */}
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <div>
                <div className="font-bold text-white text-xs truncate">
                  {currentSeller?.storeName || 'Brandy Store'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/75 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${isMultiBrand ? 'bg-amber-400' : 'bg-green-400'}`}
                  />
                  <span>{isMultiBrand ? 'Upgraded by admin' : 'Active seller'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (window.location.href = '/api/auth/signout')}
                className="flex items-center gap-2 text-xs font-semibold text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-all w-full cursor-pointer border border-white/10"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (hidden on mobile) */}
      <div
        className="sidebar hidden md:flex"
        style={{
          width: 250,
          minWidth: 250,
          background: '#0f6b50',
          color: '#fff',
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div className="logo flex items-center gap-2 px-4 py-4 text-white font-bold text-base">
          <ShoppingBag size={20} />
          <span>SellerHub</span>
        </div>

        {/* Multi-Brand Header Indicator */}
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: '11px',
              background: '#fbbf24',
              color: '#3b2a00',
              padding: '3px 8px',
              borderRadius: '99px',
              fontWeight: 700,
              letterSpacing: '.5px',
            }}
          >
            {isMultiBrand ? 'MULTI-BRAND' : 'SINGLE BRAND'}
          </span>
          {isMultiBrand && (
            <span style={{ fontSize: '12px', opacity: 0.8, color: '#fff' }}>
              {brands.length} brands
            </span>
          )}
        </div>

        {/* Active Brand Switcher Section */}
        <div
          style={{
            margin: '18px 16px 6px',
            fontSize: '11px',
            letterSpacing: '1px',
            opacity: 0.7,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          ACTIVE BRAND
        </div>
        <div
          style={{
            margin: '0 16px',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {/* All Brands button */}
          <button
            type="button"
            onClick={() => {
              setActiveBrand('all');
              router.push('/seller-hub?tab=products');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: 0,
              borderRadius: activeBrand === 'all' ? '14px' : '10px',
              cursor: 'pointer',
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: '17px',
              color: activeBrand === 'all' ? '#0c674a' : '#ffffff',
              background: activeBrand === 'all' ? '#ffffff' : 'transparent',
              fontWeight: activeBrand === 'all' ? 700 : 400,
              width: '100%',
              transition: 'all 0.15s ease',
              boxShadow: activeBrand === 'all' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <span
              style={{ textAlign: 'left', flex: 1, fontWeight: activeBrand === 'all' ? 700 : 400 }}
            >
              All brands
            </span>
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: '16px',
                fontWeight: activeBrand === 'all' ? 500 : 400,
                color: activeBrand === 'all' ? '#0c674a' : '#ffffff',
                opacity: activeBrand === 'all' ? 1 : 0.85,
              }}
            >
              {ordersCount}
            </span>
          </button>

          {/* Individual Brands */}
          {brands.map((b: any) => {
            const isSelected = activeBrand === b.slug;
            const bOrdersCount = (sellerData?.myOrders || []).filter((o: any) =>
              o.items?.some(
                (i: any) =>
                  i.variant?.product?.brandId === b.id || i.variant?.product?.brand === b.name
              )
            ).length;
            const displayCount = (sellerData?.myOrders || []).length > 0 ? bOrdersCount : 0;

            return (
              <div key={b.id || b.slug} style={{ display: 'flex', flexDirection: 'column' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBrand(b.slug);
                    router.push('/seller-hub?tab=products');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    border: 0,
                    borderRadius: isSelected ? '14px' : '10px',
                    cursor: 'pointer',
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: '17px',
                    color: isSelected ? '#0c674a' : '#ffffff',
                    background: isSelected ? '#ffffff' : 'transparent',
                    fontWeight: isSelected ? 700 : 400,
                    width: '100%',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '4px',
                      background: b.accentColor || '#0c674a',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ flex: 1, textAlign: 'left', fontWeight: isSelected ? 700 : 400 }}
                    className="truncate"
                  >
                    {b.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '16px',
                      color: isSelected ? '#0c674a' : '#ffffff',
                      opacity: isSelected ? 1 : 0.85,
                      fontWeight: 400,
                    }}
                  >
                    {displayCount}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

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

        {/* Main Nav Items */}
        <Link href="/seller-hub?tab=overview" className="nav-item">
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </Link>
        <Link href="/seller-hub?tab=orders" className="nav-item">
          <Package size={18} />
          <span>Orders</span>
        </Link>
        <Link href="/seller-hub?tab=products" className="nav-item active">
          <ShoppingBag size={18} />
          <span>Inventory</span>
        </Link>
        <Link href="/seller-hub?tab=analytics" className="nav-item">
          <BarChart3 size={18} />
          <span>Analytics</span>
        </Link>
        <Link href="/seller-hub?tab=wallet" className="nav-item">
          <Wallet size={18} />
          <span>Wallet</span>
        </Link>
        <Link href="/seller-hub?tab=settings" className="nav-item">
          <Settings size={18} />
          <span>Settings</span>
        </Link>

        <div className="mt-auto px-4 pb-6 flex flex-col gap-3">
          <div>
            <div className="store-label truncate max-w-full font-bold text-white text-xs">
              {currentSeller?.storeName || 'Brandy Store'}
            </div>
            <div className="active-dot-row flex items-center gap-2 text-[10px] text-white/80 mt-0.5">
              <div
                className={`active-dot w-2 h-2 rounded-full ${isMultiBrand ? 'bg-amber-400' : 'bg-green-400'}`}
              ></div>
              {isMultiBrand ? 'Upgraded by admin' : 'Active seller'}
            </div>
          </div>
          <button
            onClick={() => (window.location.href = '/api/auth/signout')}
            className="flex items-center gap-2 text-xs font-semibold text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-all w-full cursor-pointer border border-white/10"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">Edit Product</div>
          <div className="flex gap-3">
            <Link
              href="/seller-hub?tab=products"
              className="px-4 py-2 border border-slate-200 rounded text-sm"
            >
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
                    className="input-field font-bold text-slate-900"
                    required
                  />
                  <PriceCommissionCalculator
                    basePrice={form.basePrice}
                    commissionRate={sellerData?.currentSeller?.commissionRate ?? 0.1}
                    onApplyPrice={newPrice => setForm({ ...form, basePrice: newPrice })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Weight (KG) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 0.5"
                    value={form.weightGrams ? form.weightGrams / 1000 : ''}
                    onChange={e =>
                      setForm({ ...form, weightGrams: Math.round(Number(e.target.value) * 1000) })
                    }
                    className="input-field"
                    required
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
                        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                          <span className="text-[10px] font-bold text-slate-400 mr-1 select-none">
                            Quick select:
                          </span>
                          {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'].map(sz => {
                            const active = (v.sizes || '')
                              .split(',')
                              .map((s: string) => s.trim().toLowerCase())
                              .includes(sz.toLowerCase());
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => {
                                  const list = (v.sizes || '')
                                    .split(',')
                                    .map((s: string) => s.trim())
                                    .filter(Boolean);
                                  let next;
                                  if (active) {
                                    next = list.filter(
                                      (s: string) => s.toLowerCase() !== sz.toLowerCase()
                                    );
                                  } else {
                                    next = [...list, sz];
                                  }
                                  updateVariant(i, 'sizes', next.join(', '));
                                }}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                  active
                                    ? 'bg-emerald-500 text-white border-transparent shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/40 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
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
                          onChange={e => updateVariant(i, 'upc', e.target.value.slice(0, 14))}
                          placeholder="UPC / barcode (optional)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
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
              <h3 className="card-title mb-1">Tags</h3>
              <p className="text-xs text-slate-400 mb-3">
                Click any tag below to select or deselect it for your product.
              </p>

              {/* Active Selected Tags */}
              {tags.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Selected Tags ({tags.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-[#0F6E56] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-white/80 hover:text-white font-bold ml-0.5 cursor-pointer"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Tag Picker */}
              <div className="mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Available System Tags:
                </span>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 max-h-52 overflow-y-auto">
                  {(() => {
                    const dbTagNames = (sellerData?.tags || [])
                      .map((t: any) => (typeof t === 'string' ? t : t?.name))
                      .filter(Boolean);
                    const allSystemTags = Array.from(
                      new Set([...AVAILABLE_SYSTEM_TAGS, ...dbTagNames, ...tags])
                    );

                    return allSystemTags.map(tName => {
                      const isSelected = tags.some(t => t.toLowerCase() === tName.toLowerCase());
                      return (
                        <button
                          key={tName}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              removeTag(tName);
                            } else {
                              addTag(tName);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 select-none ${
                            isSelected
                              ? 'bg-[#0F6E56] text-white shadow-xs scale-105 border border-transparent'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>#{tName}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="input-field text-xs"
                  placeholder="Or type a custom tag and click Add..."
                />
                <button
                  type="button"
                  onClick={() => addTag()}
                  className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                >
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
                  // eslint-disable-next-line @next/next/no-img-element
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
              {(() => {
                const rate = sellerData?.currentSeller?.commissionRate ?? 0.1;
                const baseP = Number(form.basePrice) || 0;
                const customerP =
                  baseP > 0 ? (Math.round(baseP * (1 + rate) * 100) / 100).toFixed(2) : '0';
                return (
                  <div className="mt-1">
                    <p className="text-[#0F6E56] font-black text-base">{customerP} EGP</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      New Customer Price ({Math.round(rate * 100)}% fee)
                    </p>
                  </div>
                );
              })()}
              {form.flashSalePrice && (
                <p className="text-red-500 text-sm mt-1">{form.flashSalePrice} EGP Sale!</p>
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

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link
          href="/seller-hub?tab=overview"
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px]">Overview</span>
        </Link>

        <Link
          href="/seller-hub?tab=orders"
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Package size={20} />
          <span className="text-[10px]">Orders</span>
        </Link>

        <Link
          href="/seller-hub?tab=products"
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[#0f6e56] font-bold transition-colors"
        >
          <ShoppingBag size={20} />
          <span className="text-[10px]">Inventory</span>
        </Link>

        <Link
          href="/seller-hub?tab=analytics"
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
        >
          <BarChart3 size={20} />
          <span className="text-[10px]">Analytics</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <Menu size={20} />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>

      <style jsx global>{`
        .db {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }
        .sidebar {
          width: 250px;
          min-width: 250px;
          background: #0f6b50;
          padding: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
          position: sticky;
          top: 0;
          align-self: flex-start;
        }
        .nav-item {
          padding: 10px 16px;
          color: #fff;
          opacity: 0.7;
          transition: 0.2s;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          font-size: 13px;
          text-decoration: none;
        }
        .nav-item:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .nav-item.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          font-weight: 700;
          border-right: 4px solid #4ade80;
          color: #fff;
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
          font-weight: 700;
          color: #1e293b;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          padding: 20px;
        }
        .card-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }
        .input-field {
          width: 100%;
          border: 1px solid #e2e8f0;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .input-field:focus {
          border-color: #0f6e56;
        }
        @media (max-width: 900px) {
          .db {
            flex-direction: column;
          }
          .sidebar {
            display: none !important;
          }
          .main {
            padding: 16px;
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  );
}
