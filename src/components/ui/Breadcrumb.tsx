'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
}

export function Breadcrumb({ items, separator, className = '' }: BreadcrumbProps) {
  const defaultSeparator = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">{separator || defaultSeparator}</span>}
            {isLast || !item.href ? (
              <span className="text-gray-600 font-medium truncate max-w-[200px]">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-[hsl(var(--primary))] hover:underline truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;