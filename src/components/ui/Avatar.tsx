'use client';

import Image from 'next/image';
import { useState } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';

interface AvatarProps {
  src?: string;
  fallback: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  showStatus?: boolean;
  statusColor?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
  alt?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-lg',
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  square: 'rounded-lg',
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
};

export function Avatar({ src, fallback, size = 'md', shape = 'circle', showStatus, statusColor = 'online', className = '', alt = 'Avatar' }: AvatarProps) {
  const [error, setError] = useState(false);

  const initials = fallback.slice(0, 2).toUpperCase();

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`
          flex items-center justify-center overflow-hidden bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-bold
          ${sizeClasses[size]}
          ${shapeClasses[shape]}
        `}
      >
        {src && !error ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showStatus && (
        <span
          className={`
            absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
            ${statusColors[statusColor]}
          `}
        />
      )}
    </div>
  );
}

export default Avatar;