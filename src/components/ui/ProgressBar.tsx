'use client';

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error';

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
  variant?: ProgressBarVariant;
  className?: string;
}

const variantColors: Record<ProgressBarVariant, string> = {
  default: 'bg-[hsl(var(--primary))]',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

export function ProgressBar({
  value,
  label,
  showValue = false,
  animated = false,
  variant = 'default',
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showValue && <span className="text-sm text-gray-500">{clampedValue}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`
            h-full rounded-full transition-all duration-500
            ${variantColors[variant]}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;