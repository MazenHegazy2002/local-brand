'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  divider?: boolean;
  submenu?: DropdownItem[];
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, items, align = 'left', className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSubmenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSubmenuOpen(null);
    }
  };

  const renderItems = (menuItems: DropdownItem[], level = 0) => {
    return menuItems.map((item) => {
      if (item.divider) {
        return <div key={item.id} className="h-px bg-gray-100 my-1" />;
      }

      const hasSubmenu = item.submenu && item.submenu.length > 0;
      const isSubmenuOpen = submenuOpen === item.id;

      return (
        <div key={item.id} className="relative">
          <button
            onClick={() => {
              if (hasSubmenu) {
                setSubmenuOpen(isSubmenuOpen ? null : item.id);
              } else {
                item.onClick?.();
                setIsOpen(false);
              }
            }}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-3 px-3 py-2 text-sm text-left
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
              ${level > 0 ? 'text-gray-700' : 'text-gray-700'}
            `}
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {hasSubmenu && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={level > 0 ? 'rotate-90' : ''}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
          {hasSubmenu && isSubmenuOpen && (
            <div className={`absolute top-0 ${align === 'left' ? 'left-full ml-1' : 'right-full mr-1'} bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[160px] z-50`}>
              {renderItems(item.submenu!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`relative ${className}`} ref={menuRef} onKeyDown={handleKeyDown}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`
            absolute top-full mt-2 bg-white rounded-[var(--radius)] shadow-lg border border-gray-100 py-1 min-w-[180px] z-50
            animate-in fade-in duration-150
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {renderItems(items)}
        </div>
      )}
    </div>
  );
}

export default DropdownMenu;