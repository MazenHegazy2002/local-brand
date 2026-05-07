'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type DrawerPosition = 'left' | 'right' | 'bottom';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  position?: DrawerPosition;
  width?: string;
  height?: string;
  children: ReactNode;
}

const positionStyles: Record<DrawerPosition, string> = {
  left: 'left-0 top-0 bottom-0',
  right: 'right-0 top-0 bottom-0',
  bottom: 'bottom-0 left-0 right-0',
};

const transformStyles: Record<DrawerPosition, string> = {
  left: 'translate-x-0',
  right: 'translate-x-0',
  bottom: 'translate-y-0',
};

export function Drawer({ open, onClose, title, position = 'right', width = '400px', height, children }: DrawerProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const isVertical = position === 'left' || position === 'right';
  const sizeStyle = isVertical ? { width } : { height: height || '50vh' };

  const drawerContent = (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={`
          absolute ${positionStyles[position]} bg-white shadow-2xl
          transition-transform duration-300 ease-out
          ${open ? transformStyles[position] : position === 'bottom' ? 'translate-y-full' : position === 'left' ? '-translate-x-full' : 'translate-x-full'}
          ${isVertical ? 'h-full' : 'w-full'}
        `}
        style={sizeStyle}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close drawer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(drawerContent, document.body);
}

export default Drawer;