// ============================================================
// Egyptian Governorates (محافظات مصر)
// Full list of 27 governorates with English & Arabic names.
// ============================================================

export interface Governorate {
  /** Stable slug used in shipping rates and as the value submitted by forms. */
  value: string;
  /** Display name in English. */
  en: string;
  /** Display name in Arabic. */
  ar: string;
}

export const GOVERNORATES: Governorate[] = [
  { value: 'Cairo',           en: 'Cairo',                 ar: 'القاهرة' },
  { value: 'Giza',            en: 'Giza',                  ar: 'الجيزة' },
  { value: 'Alexandria',      en: 'Alexandria',            ar: 'الإسكندرية' },
  { value: 'Qalyubia',        en: 'Qalyubia',              ar: 'القليوبية' },
  { value: 'Sharqia',         en: 'Sharqia',               ar: 'الشرقية' },
  { value: 'Dakahlia',        en: 'Dakahlia',              ar: 'الدقهلية' },
  { value: 'Gharbia',         en: 'Gharbia',               ar: 'الغربية' },
  { value: 'Monufia',         en: 'Monufia',               ar: 'المنوفية' },
  { value: 'Beheira',         en: 'Beheira',               ar: 'البحيرة' },
  { value: 'Kafr El Sheikh',  en: 'Kafr El Sheikh',        ar: 'كفر الشيخ' },
  { value: 'Damietta',        en: 'Damietta',              ar: 'دمياط' },
  { value: 'Port Said',       en: 'Port Said',             ar: 'بورسعيد' },
  { value: 'Ismailia',        en: 'Ismailia',              ar: 'الإسماعيلية' },
  { value: 'Suez',            en: 'Suez',                  ar: 'السويس' },
  { value: 'North Sinai',     en: 'North Sinai',           ar: 'شمال سيناء' },
  { value: 'South Sinai',     en: 'South Sinai',           ar: 'جنوب سيناء' },
  { value: 'Faiyum',          en: 'Faiyum',                ar: 'الفيوم' },
  { value: 'Beni Suef',       en: 'Beni Suef',             ar: 'بني سويف' },
  { value: 'Minya',           en: 'Minya',                 ar: 'المنيا' },
  { value: 'Assiut',          en: 'Assiut',                ar: 'أسيوط' },
  { value: 'Sohag',           en: 'Sohag',                 ar: 'سوهاج' },
  { value: 'Qena',            en: 'Qena',                  ar: 'قنا' },
  { value: 'Luxor',           en: 'Luxor',                 ar: 'الأقصر' },
  { value: 'Aswan',           en: 'Aswan',                 ar: 'أسوان' },
  { value: 'Red Sea',         en: 'Red Sea',               ar: 'البحر الأحمر' },
  { value: 'New Valley',      en: 'New Valley',            ar: 'الوادي الجديد' },
  { value: 'Marsa Matrouh',   en: 'Marsa Matrouh',         ar: 'مرسى مطروح' },
];

/** Returns the localised label for a governorate value. */
export function localiseGovernorate(value: string, lang: 'en' | 'ar'): string {
  const g = GOVERNORATES.find((x) => x.value === value);
  if (!g) return value;
  return lang === 'ar' ? g.ar : g.en;
}
