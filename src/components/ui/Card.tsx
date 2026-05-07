'use client';

import { ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardShadow = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: CardPadding;
  shadow?: CardShadow;
  className?: string;
  onClick?: () => void;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

const shadowClasses: Record<CardShadow, string> = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export function Card({ children, header, footer, padding = 'md', shadow = 'sm', className = '', onClick }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-[var(--radius)] border border-[hsl(var(--border))]
        ${paddingClasses[padding]}
        ${shadowClasses[shadow]}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {header && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;