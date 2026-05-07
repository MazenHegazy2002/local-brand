'use client';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  showSaleBadge?: boolean;
  perUnit?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({
  price,
  originalPrice,
  currency = 'EGP',
  showSaleBadge = false,
  perUnit,
  className = '',
  size = 'md',
}: PriceDisplayProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const priceSizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-serif font-bold text-[hsl(var(--primary))] ${priceSizeClasses[size]}`}>
        {price.toLocaleString()} {currency}
      </span>
      {hasDiscount && (
        <span className="text-sm text-gray-400 line-through">
          {originalPrice.toLocaleString()} {currency}
        </span>
      )}
      {perUnit && <span className="text-xs text-gray-500">/ {perUnit}</span>}
      {showSaleBadge && hasDiscount && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          -{discountPercent}%
        </span>
      )}
    </div>
  );
}

export default PriceDisplay;