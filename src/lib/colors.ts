import type React from 'react';

// Comprehensive color dictionary for products, variants, and swatches
// Supports English names, compound phrases, and Arabic color names

export const COLOR_MAP: Record<string, string> = {
  // Blues
  'dusty blue': '#5b7c99',
  'light blue': '#93c5fd',
  'baby blue': '#bae6fd',
  'sky blue': '#38bdf8',
  'navy blue': '#1e3a8a',
  navy: '#1e3a8a',
  'dark blue': '#172554',
  'royal blue': '#1d4ed8',
  'midnight blue': '#191970',
  'deep blue': '#1e40af',
  'ice blue': '#e0f2fe',
  'denim blue': '#3b82f6',
  denim: '#3b82f6',
  'teal blue': '#0d9488',
  'petrol blue': '#005f73',
  petrol: '#005f73',
  cobalt: '#0047ab',
  sapphire: '#1d4ed8',
  cyan: '#0891b2',
  turquoise: '#06b6d4',
  aqua: '#06b6d4',
  teal: '#0d9488',
  blue: '#2563eb',

  // Greens
  'forest green': '#22543d',
  'dark green': '#14532d',
  'emerald green': '#10b981',
  emerald: '#10b981',
  'sage green': '#9caf88',
  sage: '#9caf88',
  'olive green': '#556b2f',
  olive: '#808000',
  'army green': '#4b5320',
  'mint green': '#6ee7b7',
  mint: '#6ee7b7',
  'lime green': '#84cc16',
  lime: '#84cc16',
  'moss green': '#8a9a5b',
  'sea green': '#2e8b57',
  'pine green': '#01796f',
  'khaki green': '#708238',
  pistachio: '#93c572',
  green: '#16a34a',

  // Grays & Blacks
  'midnight black': '#111827',
  'obsidian black': '#0b0f19',
  'jet black': '#000000',
  black: '#0f172a',
  'charcoal gray': '#374151',
  'charcoal grey': '#374151',
  charcoal: '#334155',
  'warm gray': '#8c827a',
  'warm grey': '#8c827a',
  'cool gray': '#64748b',
  'cool grey': '#64748b',
  'dark gray': '#475569',
  'dark grey': '#475569',
  'light gray': '#cbd5e1',
  'light grey': '#cbd5e1',
  'slate gray': '#708090',
  slate: '#64748b',
  'silver gray': '#d1d5db',
  silver: '#cbd5e1',
  'heather gray': '#9ca3af',
  'ash gray': '#b2beb5',
  anthracite: '#293133',
  gray: '#64748b',
  grey: '#64748b',

  // Whites & Neutrals
  'pearl white': '#f8f6f0',
  'off white': '#faf9f6',
  'off-white': '#faf9f6',
  ivory: '#fffff0',
  white: '#ffffff',
  cream: '#fef3c7',
  beige: '#f5f5dc',
  sand: '#e5b869',
  camel: '#c2b280',
  tan: '#d2b48c',
  khaki: '#f0e68c',
  taupe: '#6d5d52',
  nude: '#e3bc9a',
  natural: '#e8d8c8',
  ecru: '#c2b280',
  champagne: '#f7e7ce',

  // Browns & Earth Tones
  'dark brown': '#451a03',
  'light brown': '#a16207',
  chocolate: '#4a3728',
  espresso: '#362b28',
  coffee: '#6f4e37',
  mocha: '#967969',
  caramel: '#c68a4c',
  cognac: '#9a463d',
  walnut: '#5c4033',
  chestnut: '#954535',
  amber: '#f59e0b',
  terracotta: '#c35237',
  rust: '#b45309',
  'brick red': '#b22222',
  bronze: '#cd7f32',
  copper: '#b87333',
  brown: '#78350f',

  // Reds & Pinks
  'dark red': '#7f1d1d',
  'light red': '#f87171',
  brick: '#b22222',
  crimson: '#dc143c',
  scarlet: '#ff2400',
  ruby: '#e0115f',
  'coral red': '#f87171',
  coral: '#f87171',
  salmon: '#fa8072',
  'dusty rose': '#dcae96',
  'dusty pink': '#dcae96',
  'rose gold': '#b76e79',
  rose: '#f43f5e',
  blush: '#de5d83',
  'hot pink': '#ff69b4',
  'baby pink': '#fce7f3',
  'light pink': '#fbcfe8',
  peach: '#ffebd2',
  apricot: '#ffb7c5',
  cherry: '#de3163',
  fuchsia: '#ff00ff',
  magenta: '#c026d3',
  pink: '#db2777',
  red: '#dc2626',

  // Purples & Violets
  'dark purple': '#581c87',
  violet: '#7c3aed',
  lavender: '#e9d5ff',
  lilac: '#d8b4fe',
  mauve: '#e0b0ff',
  plum: '#4a0e4e',
  burgundy: '#881337',
  maroon: '#7f1d1d',
  wine: '#722f37',
  bordeaux: '#4c1c24',
  eggplant: '#483248',
  aubergine: '#3b0910',
  indigo: '#4f46e5',
  purple: '#9333ea',

  // Yellows & Oranges
  'light yellow': '#fef08a',
  mustard: '#ca8a04',
  golden: '#d97706',
  gold: '#d97706',
  'dark orange': '#c2410c',
  'light orange': '#fdba74',
  ochre: '#cc7722',
  saffron: '#f4c430',
  orange: '#ea580c',
  yellow: '#eab308',

  // Arabic Color Names
  'أبيض لؤلؤي': '#f8f6f0',
  أبيض: '#ffffff',
  'أسود منتصف الليل': '#111827',
  'أسود أوبسيديان': '#0b0f19',
  'أسود فاحم': '#000000',
  أسود: '#0f172a',
  'أزرق غباري': '#5b7c99',
  'أزرق منتصف الليل': '#191970',
  'أزرق داكن': '#1e40af',
  'أزرق فاتح': '#93c5fd',
  أزرق: '#2563eb',
  كحلي: '#1e3a8a',
  سماوي: '#38bdf8',
  'أخضر الغابة': '#22543d',
  'أخضر داكن': '#14532d',
  'أخضر فاتح': '#86efac',
  أخضر: '#16a34a',
  زمردي: '#10b981',
  زيتي: '#808000',
  مرمية: '#9caf88',
  نعناع: '#6ee7b7',
  'أحمر مرجاني': '#f87171',
  'أحمر داكن': '#7f1d1d',
  أحمر: '#dc2626',
  نبيتي: '#7f1d1d',
  برغندي: '#881337',
  خمري: '#722f37',
  كرز: '#de3163',
  'ذهبي وردي': '#b76e79',
  'وردي فاتح': '#fbcfe8',
  وردي: '#db2777',
  زهري: '#f43f5e',
  مستردة: '#ca8a04',
  ذهبي: '#d97706',
  أصفر: '#eab308',
  برتقالي: '#ea580c',
  طوبي: '#b45309',
  تيراكوتا: '#c35237',
  'رمادي دافئ': '#8c827a',
  'رمادي فاتح': '#cbd5e1',
  'رمادي داكن': '#475569',
  رمادي: '#64748b',
  فضي: '#cbd5e1',
  شوكولاتة: '#4a3728',
  إسبريسو: '#362b28',
  'بني داكن': '#451a03',
  بني: '#78350f',
  جملي: '#c2b280',
  بيج: '#f5f5dc',
  عاجي: '#fffff0',
  طبيعي: '#e8d8c8',
  بنفسجي: '#9333ea',
  لافندر: '#e9d5ff',
  ياسمين: '#fffde7',
  عسل: '#e5a65e',
  تركواز: '#06b6d4',
};

// Sort entries by key length descending once so compound colors (e.g. "forest green")
// match before simple ones (e.g. "green").
const SORTED_COLOR_ENTRIES = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);

/**
 * Returns a CSS-usable color string (hex code or linear-gradient) for any variant color name.
 */
export function getSwatchBackground(colorName: string): string {
  if (!colorName) return '#94a3b8';
  const name = colorName.toLowerCase().trim();

  // If already a valid hex, rgb, or hsl color
  if (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(name) ||
    /^rgb\(/.test(name) ||
    /^hsl\(/.test(name)
  ) {
    return name;
  }

  // Exact match
  if (COLOR_MAP[name]) return COLOR_MAP[name];

  // Split-color combinations e.g. "White / Navy", "Black - Red"
  if (name.includes('/') || (name.includes(' - ') && !name.startsWith('-'))) {
    const parts = name.split(/\/|\s+-\s+/).map(p => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const color1 = getSwatchBackground(parts[0]);
      const color2 = getSwatchBackground(parts[1]);
      return `linear-gradient(135deg, ${color1} 50%, ${color2} 50%)`;
    }
  }

  // Compound / Substring matching sorted by length (longer phrase matches first)
  for (const [key, val] of SORTED_COLOR_ENTRIES) {
    if (name.includes(key)) {
      return val;
    }
  }

  return '#94a3b8';
}

/**
 * Generates the clean React style object for swatches.
 * Critical: Never pass { backgroundColor: ..., background: undefined } together
 * because in React 19 the undefined 'background' shorthand will clear 'backgroundColor'
 * during hydration, leaving the swatch blank/white.
 */
export function getSwatchStyle(colorName: string): React.CSSProperties {
  const bg = getSwatchBackground(colorName);
  if (bg.includes('gradient')) {
    return { background: bg };
  }
  return { backgroundColor: bg };
}
