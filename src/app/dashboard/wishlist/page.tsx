'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    basePrice: number;
    images: { url: string }[];
    category: { name: string };
  };
}

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/wishlist');
    }
  }, [status, router]);

  const fetchWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist');
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const removeFromWishlist = async (productId: string) => {
    try {
      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      setWishlist(prev => prev.filter(w => w.productId !== productId));
    } catch (e) {
      console.error(e);
    }
  };

  const moveToCart = async (item: WishlistItem) => {
    addItem({
      id: String(item.productId),
      name: item.product.title,
      price: item.product.basePrice,
      image: item.product.images[0]?.url,
    });
    setAddedToCart(prev => ({ ...prev, [item.productId]: true }));
    await removeFromWishlist(item.productId);
    setTimeout(() => setAddedToCart(prev => ({ ...prev, [item.productId]: false })), 1500);
  };

  const addToCart = async (item: WishlistItem) => {
    addItem({
      id: String(item.productId),
      name: item.product.title,
      price: item.product.basePrice,
      image: item.product.images[0]?.url,
    });
    setAddedToCart(prev => ({ ...prev, [item.productId]: true }));
    setTimeout(() => setAddedToCart(prev => ({ ...prev, [item.productId]: false })), 1500);
  };

  if (loading) {
    return <div className="db"><div className="main">Loading...</div></div>;
  }

  return (
    <div className="db">
      <div className="sidebar">
        <div className="logo">My<span>LB</span></div>
        
        <div className="nav-section">Personal</div>
        <Link href="/dashboard" className="nav-item">Overview</Link>
        <Link href="/dashboard/orders" className="nav-item">My Orders</Link>
        <Link href="/dashboard/wishlist" className="nav-item active">Wishlist</Link>
        <Link href="/dashboard/notifications" className="nav-item">Alerts</Link>
        
        <div className="nav-section">Finance</div>
        <Link href="/dashboard/wallet" className="nav-item">Wallet</Link>
        
        <div className="nav-section">System</div>
        <Link href="/dashboard/settings" className="nav-item">Settings</Link>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="page-title">Saved items</div>
          <span className="text-xs text-slate-500">{wishlist.length} items</span>
        </div>

        {wishlist.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-5xl mb-4">❤️</div>
            <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-sm text-slate-500 mb-6">Save items you love to see them here</p>
            <Link href="/shop" className="inline-block px-6 py-3 bg-[#534AB7] text-white rounded-lg font-medium">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlist.map(item => (
              <div key={item.id} className="card">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-lg overflow-hidden shrink-0">
                    {item.product.images[0] && (
                      <img src={item.product.images[0].url} alt={item.product.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.productId}`} className="font-medium text-sm hover:text-[#534AB7] truncate block">
                      {item.product.title}
                    </Link>
                    <p className="text-xs text-slate-500 mb-2">{item.product.category?.name}</p>
                    <p className="font-bold text-[#534AB7]">{item.product.basePrice?.toLocaleString()} EGP</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => moveToCart(item)}
                    className="flex-1 py-2 text-xs font-medium border border-slate-200 rounded hover:bg-slate-50"
                  >
                    Move to Cart
                  </button>
                  <button 
                    onClick={() => addToCart(item)}
                    className={`flex-1 py-2 text-xs font-medium rounded ${
                      addedToCart[item.productId] 
                        ? 'bg-green-500 text-white' 
                        : 'bg-[#534AB7] text-white hover:opacity-90'
                    }`}
                  >
                    {addedToCart[item.productId] ? 'Added!' : 'Add to Cart'}
                  </button>
                  <button 
                    onClick={() => removeFromWishlist(item.productId)}
                    className="px-3 py-2 text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .db { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
        .sidebar { width: 186px; flex-shrink: 0; background: #1a1a2e; padding: 16px 0; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
        .logo { padding: 0 16px 20px; font-size: 15px; font-weight: 500; color: #fff; }
        .logo span { color: #7F77DD; }
        .nav-section { font-size: 10px; font-weight: 500; color: #64748b; letter-spacing: 0.08em; padding: 10px 16px 4px; text-transform: uppercase; }
        .nav-item { display: flex; align-items: center; gap: 9px; padding: 8px 16px; cursor: pointer; font-size: 12px; color: #888; transition: all 0.12s; }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: #ccc; }
        .nav-item.active { background: rgba(127,119,221,0.15); color: #AFA9EC; }
        .main { flex: 1; min-width: 0; padding: 18px; overflow: auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .page-title { font-size: 17px; font-weight: 500; color: #1e293b; }
        .card { background: #fff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06); padding: 16px; }
      `}</style>
    </div>
  );
}