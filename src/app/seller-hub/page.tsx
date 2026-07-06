'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  BarChart3,
  Wallet,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Star,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getDashboardStats,
  createProduct,
  deleteProduct,
  updateOrderItemStatus,
  toggleProductPublished,
} from '../actions/seller';
import {
  Product,
  Order,
  Category,
  SellerProfile,
  SessionUser,
  ProductVariant,
  Tag,
  Collection,
} from '@/types';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  balance: number;
  // Earnings from delivered orders that haven't cleared the 14-day escrow
  // window yet — kept separate from `balance` so we never accidentally
  // count held money as withdrawable.
  heldBalance?: number;
  nextReleaseAt?: string | null;
  revenue: number;
  dailyRevenue: number[];
  avgRating: number;
  reviewCount: number;
  todayOrdersCount: number;
  thisMonthRevenue: number;
  monthlyChangePct: number;
  performance: {
    orderAcceptance: number;
    returnRate: number;
    shippingSpeed: number;
  };
}

interface DashboardData {
  currentSeller?: SellerProfile;
  myProducts?: Product[];
  myOrders?: Order[];
  stats?: DashboardStats;
  categories?: Category[];
  tags?: Tag[];
  collections?: Collection[];
  error?: string;
}

interface NewProductState {
  title: string;
  description: string;
  basePrice: string | number;
  flashSalePrice: string | number;
  categoryId: string;
}

interface VariantState {
  color: string;
  stock: number;
  price: string | number;
  image: string;
  // Optional inventory codes — sku is auto-generated server-side when blank.
  sku?: string;
  upc?: string;
  uploading?: boolean;
  sizes?: string;
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

export default function SellerHub() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeLink, setStoreLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data?.currentSeller?.storeName) {
      const slug = data.currentSeller.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setStoreLink(`${window.location.origin}/brand/${slug}`);
    }
  }, [data]);

  const handleCopyLink = () => {
    if (storeLink) {
      navigator.clipboard.writeText(storeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access control — seller hub is an isolated portal; redirect all non-sellers
  useEffect(() => {
    const role = (session?.user as SessionUser | undefined)?.role;
    if (sessionStatus === 'unauthenticated') {
      router.push('/seller/login');
    } else if (session && role === 'ADMIN') {
      router.push('/admin-os');
    } else if (session && role === 'BUYER') {
      router.push('/dashboard');
    }
  }, [session, sessionStatus, router]);

  const [newProduct, setNewProduct] = useState<NewProductState>({
    title: '',
    description: '',
    basePrice: '',
    flashSalePrice: '',
    categoryId: '',
  });

  const [variants, setVariants] = useState<VariantState[]>([
    { color: 'Default', stock: 10, price: '', image: '', sizes: '' },
  ]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = (await getDashboardStats()) as DashboardData;
      if (!res) {
        window.location.href = '/login?callbackUrl=/seller-hub';
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      setData(res);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show an immediate preview using a local object URL — much cheaper than
    // base64 and avoids the FileReader race condition.
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
        };
      }
      return next;
    });

    try {
      // Phone photos are routinely 5-12 MB. We compress them down to a
      // reasonable size before upload so (a) the upload itself is fast on
      // mobile data and (b) the resulting URL — even if the server falls
      // back to a base64 data URL — stays well under the Server Action
      // request limit when it later flows through createProduct.
      const { compressImage } = await import('@/lib/compress-image');
      const uploadFile = await compressImage(file);

      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}) as { url?: string; message?: string });

      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Upload failed');
      }

      // Hard guard: if the server returned a base64 data URL that's still
      // too big to be embedded in a server-action payload, refuse the
      // upload with a clear message instead of crashing the next render.
      if (data.url.startsWith('data:') && data.url.length > 700 * 1024) {
        throw new Error(
          'Image is too large after compression. Please pick a smaller photo, or ask the platform admin to enable Vercel Blob / Cloudinary so images can be hosted externally.'
        );
      }

      // Swap the local preview for the uploaded URL.
      setVariants(prev => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], image: data.url, uploading: false };
        return next;
      });
    } catch (err) {
      console.error('Upload failed:', err);
      toast({
        variant: 'error',
        title: 'Upload Failed',
        description: (err as Error).message || 'Upload failed. Please try a different photo.',
      });
      // Drop the broken preview so the user can pick again without the
      // submit button silently posting a stale local-only URL.
      setVariants(prev => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], image: '', uploading: false };
        return next;
      });
    } finally {
      // The object URL is kept alive while the preview is shown; it'll be
      // garbage-collected when the component unmounts.
    }
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      { color: '', stock: 0, price: '', image: '', sku: '', upc: '', sizes: '' },
    ]);
  };

  const updateVariant = <K extends keyof VariantState>(
    index: number,
    field: K,
    value: VariantState[K]
  ) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setVariants(updatedVariants);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!newProduct.categoryId) throw new Error('Please select a category');
      if (!newProduct.basePrice || Number(newProduct.basePrice) <= 0)
        throw new Error('Base price is required');
      if (variants.some((v: VariantState) => !v.price || Number(v.price) <= 0))
        throw new Error('All variant prices are required');

      const res = (await createProduct({
        ...newProduct,
        basePrice: Number(newProduct.basePrice),
        flashSalePrice:
          Number(newProduct.flashSalePrice) > 0 ? Number(newProduct.flashSalePrice) : undefined,
        variants: variants.map(v => ({
          ...v,
          stock: Number(v.stock),
          price: Number(v.price) || Number(newProduct.basePrice),
          sizes: v.sizes || '',
        })),
        published: true,
      })) as { error?: string };

      if (res?.error) {
        toast({ variant: 'error', title: 'Creation Failed', description: res.error });
        return;
      }

      setShowAddModal(false);
      resetForm();
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ variant: 'error', title: 'Creation Failed', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product?',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = (await deleteProduct(id)) as { error?: string };
      if (res?.error) {
        toast({ variant: 'error', title: 'Delete Failed', description: res.error });
        return;
      }
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  const handleFulfill = async (itemId: string) => {
    // "Mark Ready" — seller has packed this item; status moves to CONFIRMED which
    // cascades the parent order to PROCESSING once all items are ready.
    try {
      const res = (await updateOrderItemStatus(itemId, 'CONFIRMED')) as { error?: string };
      if (res?.error) {
        toast({ variant: 'error', title: 'Fulfillment Failed', description: res.error });
        return;
      }
      await refreshData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ variant: 'error', title: 'Error', description: err.message });
    }
  };

  const resetForm = () => {
    setNewProduct({
      title: '',
      description: '',
      basePrice: '',
      flashSalePrice: '',
      categoryId: '',
    });
    setVariants([{ color: 'Default', stock: 10, price: '', image: '', sizes: '' }]);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading && !data)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-[#0F6E56] font-medium">
        Loading SellerHub...
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] text-red-600 font-bold">
        {error}
      </div>
    );

  const stats: DashboardStats = data?.stats || {
    totalProducts: 0,
    totalOrders: 0,
    balance: 0,
    heldBalance: 0,
    nextReleaseAt: null,
    revenue: 0,
    dailyRevenue: [],
    avgRating: 0,
    reviewCount: 0,
    todayOrdersCount: 0,
    thisMonthRevenue: 0,
    monthlyChangePct: 0,
    performance: {
      orderAcceptance: 100,
      returnRate: 0,
      shippingSpeed: 95,
    },
  };
  const myProducts = data?.myProducts || [];
  const myOrders = data?.myOrders || [];

  // ── Pending approval gate ───────────────────────────────────────────────
  if (data?.currentSeller?.status === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#d97706" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Account under review</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Your seller application for{' '}
            <strong className="text-gray-800">{data.currentSeller.storeName}</strong> is being
            reviewed by our team. You&apos;ll receive an email once it&apos;s approved — usually
            within 1–2 business days.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
            <p className="text-amber-800 text-xs font-semibold mb-1">While you wait:</p>
            <ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
              <li>Make sure you verified your email address</li>
              <li>Prepare your product photos and descriptions</li>
              <li>Check your inbox for updates from our team</li>
            </ul>
          </div>
          <button
            onClick={() => (window.location.href = '/api/auth/signout')}
            className="text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="db">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo flex items-center gap-2 px-4 py-4 text-white font-black text-base">
          <ShoppingBag size={20} />
          <span>SellerHub</span>
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

        <NavItem
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          label="Overview"
          icon={<LayoutDashboard size={18} />}
        />
        <NavItem
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          label={`Orders${myOrders.flatMap(o => o.items || []).filter(i => i.status === 'PENDING').length > 0 ? ` (${myOrders.flatMap(o => o.items || []).filter(i => i.status === 'PENDING').length})` : ''}`}
          icon={<Package size={18} />}
        />
        <NavItem
          active={activeTab === 'products'}
          onClick={() => setActiveTab('products')}
          label="Inventory"
          icon={<ShoppingBag size={18} />}
        />
        <NavItem
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          label="Analytics"
          icon={<BarChart3 size={18} />}
        />
        <NavItem
          active={activeTab === 'wallet'}
          onClick={() => setActiveTab('wallet')}
          label="Wallet"
          icon={<Wallet size={18} />}
        />
        <NavItem
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          label="Settings"
          icon={<Settings size={18} />}
        />

        <div className="mt-auto px-4 pb-6">
          <div className="store-label truncate max-w-full">
            {data?.currentSeller?.storeName || 'Store'}
          </div>
          <div className="active-dot-row flex items-center gap-2 text-[10px] text-white/60">
            <div className="active-dot w-2 h-2 rounded-full bg-green-400"></div>
            Active seller
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="main">
        <div className="topbar">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="page-title">{TITLES[activeTab] || 'Dashboard'}</div>
            {storeLink && (
              <div className="flex items-center gap-2 bg-[#0F6E56]/10 text-[#0F6E56] border border-[#0F6E56]/20 rounded-full px-3 py-1 text-xs font-semibold select-none">
                <span>Store URL:</span>
                <a
                  href={storeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline opacity-85 flex items-center gap-1 font-mono text-[#0F6E56] hover:opacity-100 transition-opacity"
                >
                  {storeLink.replace(/^https?:\/\//, '')}
                  <ExternalLink size={11} />
                </a>
                <span className="text-[#0F6E56]/30">|</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="hover:opacity-70 transition-opacity flex items-center gap-1 cursor-pointer bg-transparent border-none text-[#0F6E56] p-0 outline-none"
                  title="Copy storefront link"
                >
                  <span className="font-bold text-[10px] tracking-wider uppercase">
                    {copied ? 'Copied ✓' : 'Copy'}
                  </span>
                  {!copied && <Copy size={11} />}
                </button>
              </div>
            )}
          </div>
          <button className="add-product-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add product
          </button>
        </div>

        <div className="tab-content animate-fadeIn">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} myOrders={myOrders} myProducts={myProducts} data={data!} />
          )}
          {activeTab === 'orders' && (
            <OrdersTab orders={myOrders} onFulfill={handleFulfill} onRefresh={refreshData} />
          )}
          {activeTab === 'products' && (
            <ProductsTab
              products={myProducts}
              onDelete={handleDeleteProduct}
              onAdd={() => setShowAddModal(true)}
              onAfterRefresh={refreshData}
              categories={data?.categories}
            />
          )}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats} orders={myOrders} />}
          {activeTab === 'wallet' && <WalletTab data={data!} />}
          {activeTab === 'settings' && <SettingsTab data={data!} />}
        </div>
      </div>

      {/* Modals remain same but use Lucide for close/etc */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateProduct}
          newProduct={newProduct}
          setNewProduct={setNewProduct}
          variants={variants}
          setVariants={setVariants}
          categories={data?.categories}
          isSubmitting={isSubmitting}
          handleImageUpload={handleImageUpload}
          addVariant={addVariant}
          updateVariant={updateVariant}
        />
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        html,
        body {
          height: 100%;
          margin: 0;
        }
        /* Full-viewport locked layout: sidebar fixed, main scrolls internally */
        .db {
          display: flex;
          height: 100dvh;
          overflow: hidden;
          background: #f8fafc;
        }
        .sidebar {
          width: 200px;
          min-width: 200px;
          background: #0f6e56;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow-y: auto;
        }
        .main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100dvh;
          overflow: hidden;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px 12px;
          flex-shrink: 0;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .page-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
        }
        .add-product-btn {
          background: #0f6e56;
          color: #fff;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          cursor: pointer;
        }
        .add-product-btn:hover {
          opacity: 0.9;
        }
        .tab-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: 16px 20px;
          gap: 12px;
        }
        .overview-wrap {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          gap: 12px;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          flex-shrink: 0;
        }
        .bottom-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 10px;
          flex: 1;
          min-height: 0;
        }
        .chart-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          padding: 16px;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          flex: 1;
          min-height: 0;
        }
        .health-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }
        @media (max-width: 900px) {
          .db {
            flex-direction: column;
            height: auto;
            overflow: auto;
          }
          .sidebar {
            width: 100%;
            height: auto;
            min-width: 0;
            flex-direction: row;
            flex-wrap: wrap;
            padding: 8px;
            gap: 4px;
            overflow-x: auto;
            overflow-y: visible;
          }
          .sidebar .nav-item {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .sidebar .logo {
            padding: 8px 12px !important;
          }
          .main {
            height: auto;
          }
          .tab-content {
            overflow: visible;
            flex: none;
          }
          .overview-wrap {
            flex: none;
          }
          .bottom-row {
            flex: none;
            grid-template-columns: 1fr;
          }
          .chart-bars {
            min-height: 140px;
            flex: none;
          }
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
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
        }
        .nav-item:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-item.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          font-weight: 700;
          border-right: 4px solid #4ade80;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const TITLES: Record<string, string> = {
  overview: 'Dashboard',
  products: 'Inventory',
  orders: 'Orders',
  analytics: 'Analytics',
  wallet: 'Wallet',
  settings: 'Store Settings',
};

function NavItem({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
      {label}
    </div>
  );
}

function OverviewTab({
  stats,
  myOrders: _myOrders,
  myProducts: _myProducts,
  data,
}: OverviewTabProps) {
  return (
    <div className="overview-wrap">
      {/* Top Stats Row */}
      <div className="stats-row">
        <StatCard
          label="Total Revenue"
          value={`${stats.revenue.toLocaleString()} EGP`}
          subText={`${stats.monthlyChangePct > 0 ? '+' : ''}${stats.monthlyChangePct}% from last month`}
          trend={stats.monthlyChangePct >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className="text-emerald-500" size={16} />}
        />
        <StatCard
          label="Orders"
          value={stats.totalOrders.toString()}
          subText={`${stats.todayOrdersCount} today`}
          trend="neutral"
          icon={<ShoppingBag className="text-blue-500" size={16} />}
        />
        <StatCard
          label="Available Balance"
          value={`${stats.balance.toLocaleString()} EGP`}
          subText={
            stats.heldBalance && stats.heldBalance > 0
              ? `${stats.heldBalance.toLocaleString()} EGP in 14-day escrow`
              : 'Ready for withdrawal'
          }
          trend="neutral"
          icon={<Wallet className="text-orange-500" size={16} />}
        />
        <StatCard
          label="Store Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'New'}
          subText={`${stats.reviewCount} total reviews`}
          trend="up"
          icon={<Star className="text-yellow-500 fill-yellow-500" size={16} />}
        />
      </div>

      {/* Bottom stretch row */}
      <div className="bottom-row">
        {/* Chart */}
        <div className="chart-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 14 }}>Weekly Performance</span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#94a3b8',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                }}
              ></span>
              Revenue
            </span>
          </div>
          <div className="chart-bars">
            {stats.dailyRevenue.map((val, i) => {
              const max = Math.max(...stats.dailyRevenue, 1);
              const pct = (val / max) * 100;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    minWidth: 0,
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      background: '#ecfdf5',
                      borderRadius: 8,
                      position: 'relative',
                      minHeight: 20,
                    }}
                    className="group"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: `${pct}%`,
                        background: '#10b981',
                        borderRadius: 8,
                        transition: 'height 0.6s ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -28,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#0f172a',
                        color: '#fff',
                        fontSize: 9,
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        opacity: 0,
                      }}
                      className="group-hover:opacity-100 transition-opacity"
                    >
                      {val.toLocaleString()} EGP
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                    }}
                  >
                    {
                      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][
                        (new Date().getDay() + i + 1) % 7
                      ]
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Health */}
        <div className="health-card">
          <span style={{ fontWeight: 900, fontSize: 14, flexShrink: 0 }}>Operational Health</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <MetricRow
              label="Order Acceptance"
              value={stats.performance.orderAcceptance}
              color="#0F6E56"
              icon={<CheckCircle2 size={14} />}
            />
            <MetricRow
              label="Shipping Speed"
              value={stats.performance.shippingSpeed}
              color="#3B82F6"
              icon={<Clock size={14} />}
            />
            <MetricRow
              label="Return Rate"
              value={stats.performance.returnRate}
              color="#EF4444"
              inverse
              icon={<XCircle size={14} />}
            />
          </div>
          <div style={{ paddingTop: 12, borderTop: '1px solid #f8fafc', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: 6,
              }}
            >
              <span>Account Status</span>
              <span style={{ color: '#10b981', textTransform: 'uppercase' }}>
                {data.currentSeller?.status}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                background: '#f8fafc',
                borderRadius: 99,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: '100%', width: '100%', background: '#10b981' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subText,
  trend,
  icon,
}: {
  label: string;
  value: string;
  subText: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#fff',
        padding: '12px 14px',
        borderRadius: 16,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        {trend !== 'neutral' && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              padding: '2px 7px',
              borderRadius: 99,
              background: trend === 'up' ? '#ecfdf5' : '#fef2f2',
              color: trend === 'up' ? '#10b981' : '#ef4444',
            }}
          >
            {trend === 'up' ? '▲' : '▼'}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: '#0f172a',
          marginBottom: 2,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{subText}</div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
  inverse = false,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  inverse?: boolean;
  icon: React.ReactNode;
}) {
  const isGood = inverse ? value <= 5 : value >= 90;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-600">
          {icon} {label}
        </div>
        <span className={`font-black ${isGood ? 'text-emerald-500' : 'text-amber-500'}`}>
          {value}%
        </span>
      </div>
      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000"
          style={{ width: `${value}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
}

// Sub-tabs simplified for this view
function OrdersTab({
  orders,
  onFulfill,
  onRefresh,
}: {
  orders: Order[];
  onFulfill: (id: string) => void;
  onRefresh?: () => Promise<void>;
}) {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shippingLoading, setShippingLoading] = useState(false);

  const handleMarkShipped = async (orderId: string) => {
    const confirmed = await confirm({
      title: 'Mark Shipped',
      message: 'Mark this order as shipped? This notifies the buyer.',
    });
    if (!confirmed) return;
    setShippingLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SHIPPED' }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({
          variant: 'error',
          title: 'Action Failed',
          description: d.message || 'Failed to mark as shipped',
        });
        return;
      }
      setSelectedOrder(null);
      if (onRefresh) await onRefresh();
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error',
        description: (err as Error).message || 'Failed to mark as shipped',
      });
    } finally {
      setShippingLoading(false);
    }
  };

  const allOrderItems = orders.flatMap(o =>
    (o.items || []).map(i => ({
      ...i,
      orderId: o.id,
      date: o.createdAt,
      customerName: o.user?.name || null,
      customerEmail: o.user?.email || o.guestEmail || null,
      isGuest: !o.user,
      orderStatus: o.status,
      shippingAddress: o.shippingAddressSnapshot ? JSON.parse(o.shippingAddressSnapshot) : null,
    }))
  );

  const statusCounts = allOrderItems.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const orderItems =
    statusFilter === 'all' ? allOrderItems : allOrderItems.filter(i => i.status === statusFilter);

  const STATUS_TABS = [
    'all',
    'PENDING',
    'CONFIRMED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ];

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === s
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            {s !== 'all' && statusCounts[s] ? (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  statusFilter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {statusCounts[s]}
              </span>
            ) : s === 'all' ? (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  statusFilter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allOrderItems.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-4">Item</th>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orderItems.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-900">
                    {item.productTitleSnapshot}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                  {/* Variant specs (color / sizes) — Task 11 */}
                  {item.variant?.title &&
                    item.variant.title !== 'Standard' &&
                    item.variant.title !== item.productTitleSnapshot && (
                      <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                        {item.variant.title}
                      </div>
                    )}
                  {item.variant?.attributes &&
                    (() => {
                      try {
                        const attrs = JSON.parse(item.variant.attributes);
                        const parts: string[] = [];
                        if (attrs.color) parts.push(`Color: ${attrs.color}`);
                        if (attrs.size) parts.push(`Size: ${attrs.size}`);
                        if (attrs.sizes) parts.push(`Sizes: ${attrs.sizes}`);
                        return parts.length > 0 ? (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {parts.join(' · ')}
                          </div>
                        ) : null;
                      } catch {
                        return null;
                      }
                    })()}
                  {(item.variant?.sku || item.variant?.upc) && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {item.variant.sku && <>SKU: {item.variant.sku}</>}
                      {item.variant.sku && item.variant.upc && <span className="mx-1">·</span>}
                      {item.variant.upc && <>UPC: {item.variant.upc}</>}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">
                  #{item.orderId.slice(0, 8)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-semibold text-slate-700">
                    {item.customerName || (item.isGuest ? 'Guest' : '—')}
                  </div>
                  {item.customerEmail && (
                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {item.customerEmail}
                      {item.isGuest && ' (guest)'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                      item.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-600'
                        : item.status === 'SHIPPED'
                          ? 'bg-blue-50 text-blue-600'
                          : item.status === 'CONFIRMED'
                            ? 'bg-indigo-50 text-indigo-600'
                            : item.status === 'CANCELLED' || item.status === 'RETURNED'
                              ? 'bg-red-50 text-red-500'
                              : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.status === 'CONFIRMED' ? 'Ready' : item.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3 items-center">
                    <button
                      onClick={() => setSelectedOrder(item)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      View Details
                    </button>
                    {item.status === 'PENDING' && (
                      <button
                        onClick={() => onFulfill(item.id)}
                        className="text-xs font-bold text-[#0F6E56] hover:underline"
                        title="Mark this item as packed and ready to ship"
                      >
                        Mark Ready
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orderItems.length === 0 && (
          <div className="p-20 text-center text-slate-400 text-sm">No orders to show.</div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
              <h3 className="font-black text-lg mb-6">Order Details</h3>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Order ID</div>
                    <div className="font-mono">#{selectedOrder.orderId}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">
                      Order Status
                    </div>
                    <div className="font-bold">{selectedOrder.orderStatus}</div>
                  </div>
                </div>

                {/* Item Specifications (Task 11) */}
                <div className="pb-4 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                    Item Details
                  </div>
                  <div className="font-semibold text-slate-800">
                    {selectedOrder.productTitleSnapshot}
                  </div>
                  {selectedOrder.variant?.title && selectedOrder.variant.title !== 'Standard' && (
                    <div className="text-xs text-indigo-600 font-semibold mt-1">
                      Variant: {selectedOrder.variant.title}
                    </div>
                  )}
                  {selectedOrder.variant?.attributes &&
                    (() => {
                      try {
                        const attrs = JSON.parse(selectedOrder.variant.attributes);
                        return (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {attrs.color && (
                              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                Color: {attrs.color}
                              </span>
                            )}
                            {(attrs.size || attrs.sizes) && (
                              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                Size: {attrs.size || attrs.sizes}
                              </span>
                            )}
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  <div className="text-xs text-slate-500 mt-1">
                    Qty: {selectedOrder.quantity} ·{' '}
                    {selectedOrder.priceAtPurchase?.toLocaleString()} EGP each
                  </div>
                  {(selectedOrder.variant?.sku || selectedOrder.variant?.upc) && (
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {selectedOrder.variant.sku && `SKU: ${selectedOrder.variant.sku}`}
                      {selectedOrder.variant.sku && selectedOrder.variant.upc && ' · '}
                      {selectedOrder.variant.upc && `UPC: ${selectedOrder.variant.upc}`}
                    </div>
                  )}
                </div>

                <div className="pb-4 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2">Customer</div>
                  <div>{selectedOrder.customerName || (selectedOrder.isGuest ? 'Guest' : '—')}</div>
                  <div className="text-slate-500">{selectedOrder.customerEmail}</div>
                </div>

                {selectedOrder.shippingAddress && (
                  <div className="pb-4">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Shipping Address
                    </div>
                    <div className="font-medium">{selectedOrder.shippingAddress.name}</div>
                    <div>{selectedOrder.shippingAddress.phone}</div>
                    <div className="mt-1">
                      {selectedOrder.shippingAddress.street}
                      <br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                      {selectedOrder.shippingAddress.zipCode}
                      <br />
                      {selectedOrder.shippingAddress.country}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center gap-3">
                {selectedOrder.orderStatus === 'PROCESSING' && (
                  <button
                    onClick={() => handleMarkShipped(selectedOrder.orderId)}
                    disabled={shippingLoading}
                    className="px-5 py-2 bg-[#0F6E56] hover:bg-[#0a5a45] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {shippingLoading ? 'Updating…' : '🚚 Mark as Shipped'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="ml-auto px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsTab({
  products,
  onDelete,
  onAdd,
  onAfterRefresh,
  categories = [],
}: {
  products: Product[];
  onDelete: (id: string) => void;
  onAdd: () => void;
  onAfterRefresh: () => Promise<void>;
  categories?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out' | 'low'>('all');
  const [publishFilter, setPublishFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: number;
    drafts?: number;
    published?: number;
    failed: number;
    errors?: string[];
  } | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = products.filter(p => {
    if (q) {
      const hay = `${p.title || ''} ${p.id || ''} ${p.category?.name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const stock = (p.variants || []).reduce((a, b) => a + (b.stockCount || 0), 0);
    if (stockFilter === 'in' && stock <= 0) return false;
    if (stockFilter === 'out' && stock !== 0) return false;
    if (stockFilter === 'low' && (stock === 0 || stock > 5)) return false;
    if (publishFilter === 'published' && !p.published) return false;
    if (publishFilter === 'draft' && p.published) return false;
    if (categoryFilter !== 'all' && p.category?.id !== categoryFilter) return false;
    return true;
  });

  const downloadTemplate = () => {
    // Trigger a download by navigating; the API sends Content-Disposition.
    window.location.href = '/api/products/bulk-upload';
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/products/bulk-upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setBulkResult({ success: 0, failed: 0, errors: [data.error || 'Upload failed'] });
      } else {
        setBulkResult(data);
        await onAfterRefresh();
      }
    } catch (err) {
      setBulkResult({ success: 0, failed: 0, errors: [(err as Error).message] });
    } finally {
      setBulkUploading(false);
      // reset the file input so the seller can upload the same file again
      e.target.value = '';
    }
  };

  const handlePublishToggle = async (id: string, publish: boolean) => {
    const res = await toggleProductPublished(id, publish);
    if ('error' in res && res.error) {
      toast({ variant: 'error', title: 'Action Failed', description: res.error });
      return;
    }
    await onAfterRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Bulk import banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900">Bulk import via Excel</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Download the template, fill in your products, then upload it back here. Products without
            an image stay as drafts until you add one.
          </div>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-xs font-bold text-[#0F6E56] border border-emerald-200 hover:bg-emerald-50 px-3 py-2 rounded-lg whitespace-nowrap"
        >
          Download template
        </button>
        <label className="text-xs font-bold text-white bg-[#0F6E56] hover:opacity-90 px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap inline-flex items-center gap-2">
          {bulkUploading ? 'Uploading…' : 'Upload filled file'}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleBulkUpload}
            disabled={bulkUploading}
            className="hidden"
          />
        </label>
      </div>

      {bulkResult && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">Bulk import result</div>
              <div className="text-xs text-slate-500 mt-1">
                <span className="text-emerald-600 font-semibold">{bulkResult.success}</span>{' '}
                imported
                {typeof bulkResult.drafts === 'number' && (
                  <>
                    {' '}
                    — <span className="text-amber-600 font-semibold">{bulkResult.drafts}</span>{' '}
                    drafts (need an image)
                  </>
                )}
                {typeof bulkResult.published === 'number' && bulkResult.published > 0 && (
                  <>
                    {' '}
                    — <span className="text-emerald-600 font-semibold">
                      {bulkResult.published}
                    </span>{' '}
                    published
                  </>
                )}
                {bulkResult.failed > 0 && (
                  <>
                    {' '}
                    — <span className="text-red-600 font-semibold">{bulkResult.failed}</span> failed
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setBulkResult(null)}
              aria-label="Dismiss"
              className="text-slate-400 hover:text-slate-700 text-lg"
            >
              ×
            </button>
          </div>
          {bulkResult.errors && bulkResult.errors.length > 0 && (
            <ul className="mt-3 max-h-32 overflow-y-auto text-xs text-red-600 list-disc pl-5 space-y-1">
              {bulkResult.errors.slice(0, 50).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {bulkResult.errors.length > 50 && <li>+ {bulkResult.errors.length - 50} more…</li>}
            </ul>
          )}
        </div>
      )}

      {/* Search/filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="relative flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name, category or ID…"
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-base px-1"
            >
              ×
            </button>
          )}
        </div>
        <select
          value={publishFilter}
          onChange={e => setPublishFilter(e.target.value as typeof publishFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
        {categories && categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <div className="text-xs text-slate-500 whitespace-nowrap px-1">
          {filtered.length} / {products.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          {q ? `No products match "${search}".` : 'No products yet — add your first one.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(product => {
            const stock = (product.variants || []).reduce((a, b) => a + (b.stockCount || 0), 0);
            const hasImage = (product.images?.length ?? 0) > 0;
            const isPublished = product.published === true;
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 group"
              >
                <div className="aspect-square rounded-xl bg-slate-50 mb-4 overflow-hidden relative">
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                    <img
                      src={product.images?.[0]?.url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        No image
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => router.push(`/seller-hub/products/${product.id}`)}
                      aria-label="Edit product"
                      className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-blue-500 hover:bg-white"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      aria-label="Delete product"
                      className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-red-500 hover:bg-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {!isPublished && (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-md uppercase">
                        Draft
                      </span>
                    )}
                    {stock === 0 && (
                      <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md uppercase">
                        Out of stock
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1 truncate">{product.title}</h4>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-black text-emerald-600">{product.basePrice} EGP</span>
                  <span
                    className={`font-bold ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-slate-400'}`}
                  >
                    {stock} in stock
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePublishToggle(product.id, !isPublished)}
                  disabled={!hasImage && !isPublished}
                  className={`w-full text-[11px] font-bold py-1.5 rounded-lg border ${
                    isPublished
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      : hasImage
                        ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        : 'border-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                  title={!hasImage && !isPublished ? 'Add an image before publishing' : undefined}
                >
                  {isPublished ? 'Unpublish' : hasImage ? 'Publish' : 'Add image to publish'}
                </button>
              </div>
            );
          })}
          <button
            onClick={onAdd}
            className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 transition-all gap-2 min-h-[200px]"
          >
            <Plus size={32} />
            <span className="text-sm font-bold">Add Product</span>
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ stats, orders }: { stats: DashboardStats; orders: Order[] }) {
  // Compute product-wise top-sellers & status breakdown from real data
  const totalRevenue = stats.revenue;
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Monthly revenue for the last 6 months (area chart)
  const monthlyRevenue = (() => {
    const map = new Map<string, number>();
    const now = new Date();
    // Pre-fill the last 6 months with 0 so months with no orders still appear
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      map.set(key, 0);
    }
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + (o.totalAmount ?? 0));
      }
    }
    return Array.from(map.entries()).map(([month, revenue]) => ({ month, revenue }));
  })();

  const statusBreakdown = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const topProducts = (() => {
    const map = new Map<string, { title: string; count: number; revenue: number }>();
    for (const o of orders) {
      for (const item of o.items || []) {
        const key = item.productTitleSnapshot;
        const entry = map.get(key) || { title: key, count: 0, revenue: 0 };
        entry.count += item.quantity;
        entry.revenue += item.priceAtPurchase * item.quantity;
        map.set(key, entry);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Total Revenue
          </div>
          <div className="text-3xl font-black text-slate-900">
            {totalRevenue.toLocaleString()} EGP
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {stats.monthlyChangePct > 0 ? '+' : ''}
            {stats.monthlyChangePct}% MoM
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Avg Order Value
          </div>
          <div className="text-3xl font-black text-slate-900">
            {Math.round(avgOrderValue).toLocaleString()} EGP
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Across {orders.length} orders</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Store Rating
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'New'}
            <span className="text-yellow-500 ml-1">★</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">{stats.reviewCount} reviews</div>
        </div>
      </div>

      {/* Monthly revenue area chart */}
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <h3 className="font-black text-lg mb-6">Revenue — Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f6e56" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#0f6e56" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString()} EGP`, 'Revenue']}
              contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0f6e56"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
              dot={{ r: 3, fill: '#0f6e56', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-black text-lg mb-6">Order Status Breakdown</h3>
          {Object.entries(statusBreakdown).length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No orders to analyze yet.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(statusBreakdown).map(([status, count]) => {
                const pct = Math.round((count / orders.length) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-600">{status}</span>
                      <span className="text-slate-400">
                        {count} orders ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-black text-lg mb-6">Top Products</h3>
          {topProducts.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No sales data yet.</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div
                  key={p.title}
                  className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                      {p.title}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">
                      {Math.round(p.revenue).toLocaleString()} EGP
                    </div>
                    <div className="text-[10px] text-slate-400">{p.count} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WalletTab({ data }: { data: DashboardData }) {
  // Don't seed balance from data?.currentSeller?.balance — that column is
  // legacy/stale. Always fetch the computed value from the payouts API.
  const [balance, setBalance] = useState(0);
  const [heldBalance, setHeldBalance] = useState(0);
  const [nextReleaseAt, setNextReleaseAt] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<
    Array<{
      id: string;
      amount: number;
      status: string;
      bankDetails: string | null;
      createdAt: string;
    }>
  >([]);
  const [bankAccount, setBankAccount] = useState(data?.currentSeller?.bankAccount || '');
  const [requestAmount, setRequestAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [countdown, setCountdown] = useState('');

  // Live countdown for escrow release
  useEffect(() => {
    if (!nextReleaseAt) {
      setCountdown('');
      return;
    }
    const tick = () => {
      const diff = new Date(nextReleaseAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Releasing soon…');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [nextReleaseAt]);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payouts/request');
      if (res.ok) {
        const d = await res.json();
        setBalance(Number(d.balance) || 0);
        setHeldBalance(Number(d.heldBalance) || 0);
        setNextReleaseAt(d.nextReleaseAt || null);
        setPayouts(d.payouts || []);
        if (d.bankAccount) setBankAccount(d.bankAccount);
      }
    } catch {
      // swallow
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsRequesting(true);
    try {
      const amount = requestAmount ? Number(requestAmount) : undefined;
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, bankDetails: bankAccount || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: d.message || 'Request failed' });
      } else {
        setMessage({
          type: 'success',
          text: 'Payout request submitted! It will be processed shortly.',
        });
        setRequestAmount('');
        await loadPayouts();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mature Funds (Available to withdraw)
              </div>
              <div className="text-4xl font-black text-emerald-600">
                {balance.toLocaleString()} <span className="text-lg text-slate-400">EGP</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Earnings past the 14-day escrow window
              </div>

              {(heldBalance > 0 || isLoading) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">
                    In Escrow (Pending Maturity)
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {heldBalance.toLocaleString()}{' '}
                    <span className="text-base text-slate-400">EGP</span>
                  </div>
                  {nextReleaseAt && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Next release on{' '}
                      <span className="font-semibold text-slate-700">
                        {new Date(nextReleaseAt).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {countdown && (
                    <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                        Matures in
                      </span>
                      <span className="font-mono font-black text-amber-700 text-sm">
                        {countdown}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Wallet className="text-emerald-600" />
            </div>
          </div>

          <form onSubmit={handleRequestPayout} className="border-t border-slate-50 pt-6 space-y-4">
            <h3 className="font-black text-sm">Request Payout</h3>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Amount (EGP) — leave empty to withdraw full balance
              </label>
              <input
                type="number"
                value={requestAmount}
                onChange={e => setRequestAmount(e.target.value)}
                placeholder={`Max: ${balance.toFixed(2)}`}
                min="1"
                max={balance}
                step="0.01"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Bank Account / IBAN
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={e => setBankAccount(e.target.value)}
                placeholder="e.g. NBE-EG12-3456-7890..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {message && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-bold ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={isRequesting || balance <= 0}
              className="w-full py-3 bg-[#0F6E56] text-white rounded-xl font-bold disabled:opacity-50"
            >
              {isRequesting ? 'Submitting...' : 'Request Payout'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-black text-sm mb-4">Your Commission Rate</h3>
          <div className="text-3xl font-black text-slate-900">
            {((data?.currentSeller?.commissionRate || 0.15) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Platform fee per order</div>
          <div className="mt-6 pt-6 border-t border-slate-50 text-[11px] text-slate-500 leading-relaxed">
            Earnings from delivered orders are held in escrow for 14 days to allow for returns. Once
            that window closes, your share moves into &quot;Available Balance&quot; and is ready to
            withdraw.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="font-black text-sm">Payout History</h3>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading history…</div>
        ) : payouts.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">No payouts yet.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Bank</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {payouts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-xs text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 font-black text-slate-900">
                    {p.amount.toLocaleString()} EGP
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-400 truncate max-w-[160px]">
                    {p.bankDetails || '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                        p.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-600'
                          : p.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-600'
                            : p.status === 'PROCESSING'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ data }: { data: DashboardData }) {
  const [form, setForm] = useState({
    storeName: data?.currentSeller?.storeName || '',
    description: data?.currentSeller?.description || '',
    logoUrl: data?.currentSeller?.logoUrl || '',
    city: data?.currentSeller?.city || '',
    governorate: data?.currentSeller?.governorate || '',
    bankAccount: data?.currentSeller?.bankAccount || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { compressImage } = await import('@/lib/compress-image');
      const uploadFile = await compressImage(file, { maxDimension: 800 });
      const fd = new FormData();
      fd.append('file', uploadFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.message || 'Upload failed');
      if (d.url.startsWith('data:') && d.url.length > 700 * 1024) {
        throw new Error('Logo is too large after compression. Pick a smaller image.');
      }
      setForm(f => ({ ...f, logoUrl: d.url }));
    } catch (err) {
      console.error('Logo upload failed:', err);
      setMessage({ type: 'error', text: (err as Error).message || 'Logo upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seller/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: d.message || 'Update failed' });
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully.' });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-6"
      >
        <h3 className="font-black text-lg">Store Settings</h3>

        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="Store logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-slate-300">🏪</span>
            )}
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
              Store Logo
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
                {form.logoUrl ? 'Replace logo' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {form.logoUrl && !isUploading && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}
                  className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                >
                  Remove
                </button>
              )}
              {isUploading && <span className="text-[11px] text-slate-400">Uploading…</span>}
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
            Store Name
          </label>
          <input
            required
            type="text"
            value={form.storeName}
            onChange={e => setForm({ ...form, storeName: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
            Description
          </label>
          <textarea
            rows={4}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            placeholder="Tell customers what makes your store unique..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Governorate
            </label>
            <input
              type="text"
              value={form.governorate}
              onChange={e => setForm({ ...form, governorate: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
            Bank Account / IBAN for Payouts
          </label>
          <input
            type="text"
            value={form.bankAccount}
            onChange={e => setForm({ ...form, bankAccount: e.target.value })}
            placeholder="Enter your IBAN or account details"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
          />
          <div className="text-[11px] text-slate-400 mt-1">
            This info is stored securely and only visible to admins during payout processing.
          </div>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-xl text-xs font-bold ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 bg-[#0F6E56] text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

interface AddProductModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  newProduct: NewProductState;
  setNewProduct: (p: NewProductState) => void;
  variants: VariantState[];
  setVariants: (v: VariantState[]) => void;
  categories?: Category[];
  isSubmitting: boolean;
  handleImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  addVariant: () => void;
  updateVariant: <K extends keyof VariantState>(
    index: number,
    field: K,
    value: VariantState[K]
  ) => void;
}

function AddProductModal({
  onClose,
  onSubmit,
  newProduct,
  setNewProduct,
  variants,
  setVariants,
  categories,
  isSubmitting,
  handleImageUpload,
  addVariant,
  updateVariant,
}: AddProductModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black">New Product</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <XCircle size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title</label>
              <input
                required
                type="text"
                value={newProduct.title}
                onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Description
              </label>
              <textarea
                rows={3}
                value={newProduct.description}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Category
              </label>
              <select
                required
                value={newProduct.categoryId}
                onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Select Category...</option>
                {categories?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Base Price (EGP)
              </label>
              <input
                required
                type="number"
                min="1"
                value={newProduct.basePrice}
                onChange={e => setNewProduct({ ...newProduct, basePrice: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Variants</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const priceVal = Number(newProduct.basePrice) || 0;
                    if (priceVal > 0) {
                      setVariants(variants.map(v => ({ ...v, price: priceVal })));
                    }
                  }}
                  className="text-xs font-bold text-[#0F6E56] hover:underline"
                >
                  Same Price for All Variants
                </button>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  + Add variant
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-3"
                >
                  <input
                    type="text"
                    value={v.color}
                    onChange={e => updateVariant(i, 'color', e.target.value)}
                    placeholder="Color / Variant"
                    className="col-span-3 px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={v.stock}
                    onChange={e => updateVariant(i, 'stock', Number(e.target.value))}
                    placeholder="Stock"
                    min="0"
                    className="col-span-2 px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={v.price}
                    onChange={e => updateVariant(i, 'price', Number(e.target.value))}
                    placeholder="Price"
                    min="1"
                    className="col-span-3 px-3 py-2 bg-white border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <label
                    className="col-span-3 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-[10px] text-slate-600 font-semibold"
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
                  <button
                    type="button"
                    onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                    disabled={variants.length === 1}
                    className="col-span-1 text-red-500 disabled:opacity-30"
                    aria-label="Remove variant"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="col-span-12">
                    <input
                      type="text"
                      value={v.sizes || ''}
                      onChange={e => updateVariant(i, 'sizes', e.target.value)}
                      placeholder="Sizes (CSV, e.g. S, M, L, XL)"
                      className="w-full px-3 py-2 bg-white border border-slate-100 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
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
                  {/* Optional inventory codes — collapsed onto a second row so
                      the main grid stays readable. SKU is auto-generated when
                      blank; UPC is the public barcode and only filled when
                      the seller actually has one from GS1. */}
                  <input
                    type="text"
                    value={v.sku || ''}
                    onChange={e => updateVariant(i, 'sku', e.target.value)}
                    placeholder="SKU (auto if blank)"
                    className="col-span-6 px-3 py-2 bg-white border border-slate-100 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                    autoComplete="off"
                  />
                  <input
                    type="text"
                    value={v.upc || ''}
                    onChange={e => updateVariant(i, 'upc', e.target.value.slice(0, 14))}
                    placeholder="UPC / barcode (optional)"
                    className="col-span-6 px-3 py-2 bg-white border border-slate-100 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                    autoComplete="off"
                  />
                  {v.image && (
                    <div className="col-span-12 pt-2 flex items-center gap-3">
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
                          className="text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-100 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#0F6E56] text-white rounded-xl font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface OverviewTabProps {
  stats: DashboardStats;
  myOrders: Order[];
  myProducts: Product[];
  data: DashboardData;
}
