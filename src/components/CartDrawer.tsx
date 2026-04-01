'use client';
import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import Link from 'next/link';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />

      {/* Drawer */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 400, background: '#1E2A3B',
        height: '100%', display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif', color: '#F9FAFB',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Cart</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#9CA3AF', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div style={{ fontSize: 48 }}>🛒</div>
              <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', maxWidth: 200 }}>
                Your cart is empty. Start shopping to add items!
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                {/* Image / Emoji */}
                <div style={{ width: 56, height: 56, borderRadius: 8, background: '#28364A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
                  {item.image && item.image.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    item.emoji ?? '📦'
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9FE1CB' }}>{(item.price * item.qty).toLocaleString()} EGP</div>
                  
                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <button onClick={() => updateQty(item.id, item.qty - 1)}
                      style={{ width: 24, height: 24, background: '#28364A', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#9CA3AF', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}
                      style={{ width: 24, height: 24, background: '#28364A', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#9CA3AF', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>

                <button onClick={() => removeItem(item.id)}
                  style={{ background: 'transparent', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 16, flexShrink: 0, alignSelf: 'flex-start', padding: 4 }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#E24B4A'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'}>×</button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', padding: '16px 24px', gap: 10, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>Subtotal</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#F9FAFB' }}>{total().toLocaleString()} EGP</span>
            </div>
            <Link href="/checkout" onClick={onClose}
              style={{ display: 'block', textAlign: 'center', width: '100%', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', transition: 'opacity 0.15s' }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.opacity = '1')}>
              Checkout — {total().toLocaleString()} EGP
            </Link>
            <button onClick={clearCart}
              style={{ width: '100%', background: 'transparent', color: '#6B7280', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
              Clear cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
