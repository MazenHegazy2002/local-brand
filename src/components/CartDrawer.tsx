'use client';
import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import Link from 'next/link';
import { useEffect } from 'react';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 200, 
        display: 'flex', 
        justifyContent: 'flex-end',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
      onTransitionEnd={() => !isOpen && setIsAnimating(false)}
    >
      {/* Backdrop */}
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'rgba(0,0,0,0.55)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }} 
        onClick={onClose} 
      />

      {/* Drawer */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#1a1a1a',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '20px 24px', 
          borderBottom: '1px solid #f0f0f0',
          background: '#fff'
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>Your Cart</h2>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: '#f5f5f5', 
              border: 'none', 
              borderRadius: '50%', 
              width: 36, 
              height: 36, 
              cursor: 'pointer', 
              color: '#6b7280', 
              fontSize: 18, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e5e5e5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f5'; }}
          >×</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div style={{ fontSize: 64, opacity: 0.3 }}>🛒</div>
              <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', maxWidth: 200 }}>
                Your cart is empty
              </p>
              <button 
                onClick={onClose}
                style={{ 
                  padding: '10px 24px', 
                  background: '#1a1a1a', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#333'}
                onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item, index) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  gap: 16, 
                  padding: '16px 0', 
                  borderBottom: index < items.length - 1 ? '1px solid #f0f0f0' : 'none',
                  animation: 'slideIn 0.3s ease-out',
                  animationFillMode: 'both',
                  animationDelay: `${index * 0.05}s`
                }}
              >
                {/* Image */}
                <div style={{ 
                  width: 72, 
                  height: 72, 
                  borderRadius: 12, 
                  background: '#f5f5f5', 
                  flexShrink: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 28, 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {item.image && item.image.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    item.emoji ?? '📦'
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e3b8a', marginBottom: 8 }}>{(item.price * item.qty).toLocaleString()} EGP</div>
                  
                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', borderRadius: 8, padding: '4px 8px' }}>
                      <button 
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        style={{ 
                          width: 28, 
                          height: 28, 
                          background: 'transparent', 
                          border: 'none', 
                          borderRadius: 6, 
                          cursor: 'pointer', 
                          color: '#6b7280', 
                          fontSize: 18, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                      <button 
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        style={{ 
                          width: 28, 
                          height: 28, 
                          background: 'transparent', 
                          border: 'none', 
                          borderRadius: 6, 
                          cursor: 'pointer', 
                          color: '#6b7280', 
                          fontSize: 18, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >+</button>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#ef4444', 
                        cursor: 'pointer', 
                        fontSize: 12, 
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 6,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ 
            borderTop: '1px solid #f0f0f0', 
            padding: '20px 24px', 
            gap: 12, 
            display: 'flex', 
            flexDirection: 'column',
            background: '#fff',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>Subtotal</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{total().toLocaleString()} EGP</span>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Shipping & taxes calculated at checkout</p>
            <Link 
              href="/checkout" 
              onClick={onClose}
              style={{ 
                display: 'block', 
                textAlign: 'center', 
                width: '100%', 
                background: 'linear-gradient(135deg, #1e3b8a, #2563eb)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 12, 
                padding: '14px 0', 
                fontSize: 15, 
                fontWeight: 700, 
                cursor: 'pointer', 
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(30, 59, 138, 0.3)'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { 
                e.currentTarget.style.transform = 'translateY(-2px)'; 
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 59, 138, 0.4)'; 
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 59, 138, 0.3)'; 
              }}
            >
              Checkout — {total().toLocaleString()} EGP
            </Link>
            <button 
              onClick={clearCart}
              style={{ 
                width: '100%', 
                background: 'transparent', 
                color: '#6b7280', 
                border: '1px solid #e5e5e5', 
                borderRadius: 12, 
                padding: '10px 0', 
                fontSize: 13, 
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                e.currentTarget.style.background = '#f5f5f5'; 
                e.currentTarget.style.borderColor = '#d1d5db'; 
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                e.currentTarget.style.background = 'transparent'; 
                e.currentTarget.style.borderColor = '#e5e5e5'; 
              }}
            >
              Clear cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
