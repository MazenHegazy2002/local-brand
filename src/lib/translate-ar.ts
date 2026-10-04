/**
 * Built-in (offline, no API) Arabic translation for product copy.
 * Glossary-based: known product words are translated, brand names / model numbers /
 * unknown words stay as written. Titles come out as a mixed Arabic + brand name,
 * e.g. "Nike Cotton T-Shirt Black" -> "Nike تيشيرت قطن أسود".
 * ponytail: word-level only, no grammar/reordering. Extend GLOSSARY as needed; sellers can
 * always override with titleAr by hand.
 */
const GLOSSARY: Record<string, string> = {
  // clothing
  't-shirt': 'تيشيرت',
  tshirt: 'تيشيرت',
  shirt: 'قميص',
  polo: 'بولو',
  hoodie: 'هودي',
  sweatshirt: 'سويتشيرت',
  sweater: 'سترة صوف',
  jacket: 'جاكيت',
  coat: 'معطف',
  jeans: 'جينز',
  pants: 'بنطلون',
  trousers: 'بنطلون',
  shorts: 'شورت',
  dress: 'فستان',
  skirt: 'تنورة',
  abaya: 'عباية',
  hijab: 'حجاب',
  scarf: 'وشاح',
  socks: 'شرابات',
  underwear: 'ملابس داخلية',
  pajama: 'بيجامة',
  pajamas: 'بيجامة',
  tracksuit: 'ترينج',
  suit: 'بدلة',
  blouse: 'بلوزة',
  // shoes & accessories
  shoes: 'حذاء',
  shoe: 'حذاء',
  sneakers: 'سنيكرز',
  sandals: 'صندل',
  slippers: 'شبشب',
  boots: 'بوت',
  bag: 'حقيبة',
  backpack: 'حقيبة ظهر',
  handbag: 'حقيبة يد',
  wallet: 'محفظة',
  belt: 'حزام',
  watch: 'ساعة',
  cap: 'كاب',
  hat: 'قبعة',
  sunglasses: 'نظارة شمس',
  glasses: 'نظارة',
  bracelet: 'سوار',
  necklace: 'عقد',
  ring: 'خاتم',
  earrings: 'حلق',
  // home / electronics / beauty
  headphones: 'سماعات',
  earbuds: 'سماعات أذن',
  speaker: 'سماعة',
  charger: 'شاحن',
  cable: 'كابل',
  case: 'جراب',
  cover: 'غطاء',
  phone: 'موبايل',
  laptop: 'لابتوب',
  perfume: 'عطر',
  cream: 'كريم',
  lotion: 'لوشن',
  shampoo: 'شامبو',
  soap: 'صابون',
  lamp: 'مصباح',
  pillow: 'وسادة',
  blanket: 'بطانية',
  towel: 'منشفة',
  mug: 'كوب',
  bottle: 'زجاجة',
  toy: 'لعبة',
  toys: 'ألعاب',
  set: 'طقم',
  pack: 'عبوة',
  pcs: 'قطعة',
  // materials
  cotton: 'قطن',
  leather: 'جلد',
  wool: 'صوف',
  silk: 'حرير',
  linen: 'كتان',
  denim: 'جينز',
  polyester: 'بوليستر',
  plastic: 'بلاستيك',
  metal: 'معدن',
  wooden: 'خشب',
  glass: 'زجاج',
  // colors
  black: 'أسود',
  white: 'أبيض',
  red: 'أحمر',
  blue: 'أزرق',
  green: 'أخضر',
  yellow: 'أصفر',
  grey: 'رمادي',
  gray: 'رمادي',
  brown: 'بني',
  pink: 'وردي',
  purple: 'بنفسجي',
  orange: 'برتقالي',
  beige: 'بيج',
  navy: 'كحلي',
  gold: 'ذهبي',
  silver: 'فضي',
  // audience / descriptors
  men: 'رجالي',
  mens: 'رجالي',
  man: 'رجالي',
  women: 'حريمي',
  womens: 'حريمي',
  woman: 'حريمي',
  kids: 'أطفال',
  boys: 'ولادي',
  girls: 'بناتي',
  unisex: 'للجنسين',
  baby: 'بيبي',
  new: 'جديد',
  classic: 'كلاسيك',
  slim: 'سليم',
  casual: 'كاجوال',
  sport: 'رياضي',
  sports: 'رياضي',
  summer: 'صيفي',
  winter: 'شتوي',
  premium: 'مميز',
  original: 'أصلي',
  and: 'و',
  with: 'مع',
  for: 'لـ',
  size: 'مقاس',
  small: 'صغير',
  medium: 'وسط',
  large: 'كبير',
};

function translateText(text: string): string {
  return text
    .split(/(\s+)/)
    .map(tok => {
      const m = tok.match(/^([^A-Za-z0-9-]*)([A-Za-z0-9-]+)([^A-Za-z0-9-]*)$/);
      if (!m) return tok;
      const hit = GLOSSARY[m[2].toLowerCase()];
      return hit ? m[1] + hit + m[3] : tok;
    })
    .join('');
}

export function translateToArabic(
  title: string,
  description?: string | null
): { titleAr: string; descriptionAr: string | null } | null {
  const titleAr = translateText(title.trim());
  // Nothing in the glossary matched -> don't store an identical "translation".
  if (!title.trim() || titleAr === title.trim()) return null;
  return { titleAr, descriptionAr: description ? translateText(description) : null };
}
