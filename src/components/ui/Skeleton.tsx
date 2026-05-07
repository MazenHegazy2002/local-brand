'use client';

import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div
      className={`
        bg-gray-200 rounded animate-pulse
        bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200
        bg-[length:200%_100%] animate-shimmer
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  return (
    <Skeleton className={`rounded-full ${avatarSizes[size]} ${className}`} />
  );
}

interface SkeletonButtonProps {
  className?: string;
}

export function SkeletonButton({ className = '' }: SkeletonButtonProps) {
  return (
    <Skeleton className={`h-10 w-24 rounded-[var(--radius)] ${className}`} />
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div className={`bg-white rounded-[var(--radius)] border border-gray-100 p-4 ${className}`}>
      <Skeleton className="aspect-square rounded-lg mb-4" />
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function SkeletonInput({ className = '' }: SkeletonProps) {
  return (
    <Skeleton className={`h-10 rounded-[var(--radius)] ${className}`} />
  );
}

export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-3">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="w-full aspect-[1.1/1] rounded-lg mb-4" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-gray-200 pb-12">
      {Array.from({ length: count }).map((_, i) => (
        <CategorySkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;

const styles = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .animate-shimmer {
    animation: shimmer 1.5s infinite linear;
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}