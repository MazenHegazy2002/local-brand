'use client';

import { useState, useCallback } from 'react';

interface RatingStarsProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function RatingStars({
  value,
  max = 5,
  size = 'md',
  readOnly = false,
  onChange,
  className = '',
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value;

  const handleClick = useCallback(
    (newValue: number) => {
      if (!readOnly && onChange) {
        onChange(newValue);
      }
    },
    [readOnly, onChange]
  );

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      {...(readOnly
        ? { role: 'img', 'aria-label': `Rated ${value.toFixed(1)} out of ${max} stars` }
        : {})}
    >
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        const fillPercent = Math.min(Math.max(displayValue - i, 0), 1) * 100;

        if (readOnly) {
          return (
            <span key={i} aria-hidden="true" className="relative inline-block">
              <svg
                className={`${sizeClasses[size]} text-gray-300`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                <svg
                  className={`${sizeClasses[size]} text-amber-400`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(null)}
            aria-label={`Rate ${starValue} of ${max} stars`}
            className="relative cursor-pointer transition-transform hover:scale-110"
          >
            <svg
              className={`${sizeClasses[size]} text-gray-300`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <svg
                className={`${sizeClasses[size]} text-amber-400`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default RatingStars;
