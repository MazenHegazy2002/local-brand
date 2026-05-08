'use client';

interface ColorSwatchProps {
  colors: string[];
  selected?: string;
  onSelect?: (color: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map common color names to Tailwind-friendly hex values
const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  emerald: '#10B981',
  yellow: '#F59E0B',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#6B7280',
  grey: '#6B7280',
  brown: '#92400E',
  beige: '#D4B996',
  navy: '#1E3A8A',
  cream: '#FFFDD0',
  gold: '#D4AF37',
  silver: '#C0C0C0',
  khaki: '#C3B091',
  maroon: '#800000',
  teal: '#14B8A6',
};

function resolveColor(name: string): string {
  const key = name.toLowerCase().trim();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  // If it's a hex already
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  // Hash to pseudo-color
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const color = Math.floor(Math.abs(Math.sin(hash)) * 16777215).toString(16).padStart(6, '0');
  return `#${color}`;
}

export default function ColorSwatch({
  colors,
  selected,
  onSelect,
  size = 'md',
  className = '',
}: ColorSwatchProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {colors.map((color) => {
        const hex = resolveColor(color);
        const isSelected = selected?.toLowerCase() === color.toLowerCase();
        const isLight = ['#ffffff', '#fffdd0', '#c0c0c0', '#d4b996'].includes(hex.toLowerCase());

        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelect?.(color)}
            aria-label={color}
            title={color}
            className={`${sizes[size]} rounded-full border-2 transition-all ${
              isSelected
                ? 'border-[#1e3b8a] scale-110 shadow-md'
                : isLight
                  ? 'border-gray-300'
                  : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: hex }}
          >
            {isSelected && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={isLight ? '#1e3b8a' : '#ffffff'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-full h-full p-1"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
