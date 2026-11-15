// ============================================================
// EGYPT POST SHIPPING RATES (EGP) — Governorate & Weight-based Matrix
// Source of truth: Egypt_Post_Price_List_Updated-v2.xlsx
// 27 x 27 Symmetric Governorate Shipping Matrix. Customers pay the sheet's
// "Estimated 1kg Total incl. VAT & Fee" plus a 5 EGP handling fee.
// ============================================================

export const EGYPT_POST_BASE_WEIGHT_GRAMS = 1000;
export const EGYPT_POST_EXTRA_KG_RATE = 7.0; // 7.00 EGP per extra 1000g or fraction
export const EGYPT_POST_VAT_RATE = 0.14; // 14% Egyptian VAT
export const EGYPT_POST_STAMP_FEE = 0.5; // 0.50 EGP administrative stamp fee
export const SHIPPING_HANDLING_FEE = 5; // 5 EGP added by Brandyy on top of the Egypt Post total

export const DEFAULT_SHIPPING_BASE_RATE = 65;
export const DEFAULT_SHIPPING_RATE = 79.6; // customer price for the default base rate (65 incl. VAT, stamp and handling fee)
export const FREE_SHIPPING_THRESHOLD = 1500;

// Alias mapping for alternate governorate spellings
const GOVERNORATE_ALIASES: Record<string, string> = {
  qaliubia: 'qalyubia',
  qalyubiya: 'qalyubia',
  behira: 'beheira',
  monoufia: 'monufia',
  domitta: 'damietta',
  sharkia: 'sharqia',
  fayoum: 'faiyum',
  'bani sweif': 'beni suef',
  benisuef: 'beni suef',
  menia: 'minya',
  souhage: 'sohag',
  louxor: 'luxor',
  'marsa matrouh': 'matrouh',
  'marsa matruh': 'matrouh',
  matruh: 'matrouh',
  'nourth sinai': 'north sinai',
  'new vallley': 'new valley',
  fayum: 'faiyum',
  sohaj: 'sohag',
  'el-beheira': 'beheira',
  'al qalyubia': 'qalyubia',
  القاهرة: 'cairo',
  الجيزة: 'giza',
  القليوبية: 'qalyubia',
  الإسكندرية: 'alexandria',
  الاسكندرية: 'alexandria',
  البحيرة: 'beheira',
  'كفر الشيخ': 'kafr el sheikh',
  الغربية: 'gharbia',
  المنوفية: 'monufia',
  دمياط: 'damietta',
  الدقهلية: 'dakahlia',
  الشرقية: 'sharqia',
  الإسماعيلية: 'ismailia',
  الاسماعيلية: 'ismailia',
  السويس: 'suez',
  بورسعيد: 'port said',
  'بور سعيد': 'port said',
  الفيوم: 'faiyum',
  'بني سويف': 'beni suef',
  المنيا: 'minya',
  أسيوط: 'assiut',
  اسيوط: 'assiut',
  سوهاج: 'sohag',
  قنا: 'qena',
  أسوان: 'aswan',
  اسوان: 'aswan',
  الأقصر: 'luxor',
  الاقصر: 'luxor',
  'البحر الأحمر': 'red sea',
  'البحر الاحمر': 'red sea',
  مطروح: 'matrouh',
  'الوادي الجديد': 'new valley',
  'شمال سيناء': 'north sinai',
  'جنوب سيناء': 'south sinai',
};

/** Normalizes governorate strings to canonical keys. */
export function normalizeGovernorateName(name: string): string {
  if (!name) return 'cairo';
  const key = name.toLowerCase().trim();
  return GOVERNORATE_ALIASES[key] ?? key;
}

// 27 x 27 Egypt Post price list (first 1,000 g, before VAT), from the seller's
// governorate to the customer's governorate.
// Governorates in the column order of the price rows below.
const GOVERNORATES = [
  'cairo',
  'giza',
  'qalyubia',
  'alexandria',
  'beheira',
  'kafr el sheikh',
  'gharbia',
  'monufia',
  'damietta',
  'dakahlia',
  'sharqia',
  'ismailia',
  'suez',
  'port said',
  'faiyum',
  'beni suef',
  'minya',
  'assiut',
  'sohag',
  'qena',
  'aswan',
  'luxor',
  'red sea',
  'matrouh',
  'new valley',
  'north sinai',
  'south sinai',
] as const;

// Egypt Post list price for the first 1,000 g (EGP, before VAT), one row per
// origin governorate, columns in GOVERNORATES order. Copied from
// Egypt_Post_Price_List_Updated-v2.xlsx (column "First 1000g (EGP)").
// prettier-ignore
const BASE_RATE_ROWS: Record<string, number[]> = {
  cairo: [65, 65, 65, 75, 75, 75, 75, 75, 75, 75, 75, 80, 80, 80, 85, 85, 85, 85, 110, 110, 110, 110, 110, 120, 120, 120, 120],
  giza: [65, 65, 65, 75, 75, 75, 75, 75, 75, 75, 75, 80, 80, 80, 85, 85, 85, 85, 110, 110, 110, 110, 110, 120, 120, 120, 120],
  qalyubia: [65, 65, 65, 75, 75, 75, 75, 75, 75, 75, 75, 80, 80, 80, 85, 85, 85, 85, 110, 110, 110, 110, 110, 120, 120, 120, 120],
  alexandria: [75, 75, 75, 65, 75, 75, 75, 75, 75, 75, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  beheira: [75, 75, 75, 75, 65, 75, 75, 75, 75, 75, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  'kafr el sheikh': [75, 75, 75, 75, 75, 65, 75, 75, 75, 75, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  gharbia: [75, 75, 75, 75, 75, 75, 65, 75, 75, 75, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  monufia: [75, 75, 75, 75, 75, 75, 75, 65, 75, 75, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  damietta: [75, 75, 75, 75, 75, 75, 75, 75, 65, 75, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  dakahlia: [75, 75, 75, 75, 75, 75, 75, 75, 75, 65, 75, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  sharqia: [75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 65, 85, 85, 85, 100, 100, 100, 100, 115, 115, 115, 115, 115, 120, 120, 120, 120],
  ismailia: [80, 80, 80, 85, 85, 85, 85, 85, 85, 85, 85, 65, 75, 75, 95, 95, 95, 95, 110, 110, 110, 110, 110, 120, 120, 120, 120],
  suez: [80, 80, 80, 85, 85, 85, 85, 85, 85, 85, 85, 75, 65, 75, 95, 95, 95, 95, 110, 110, 110, 110, 110, 120, 120, 120, 120],
  'port said': [80, 80, 80, 85, 85, 85, 85, 85, 85, 85, 85, 75, 75, 65, 95, 95, 95, 95, 110, 110, 110, 110, 110, 120, 120, 120, 120],
  faiyum: [85, 85, 85, 100, 100, 100, 100, 100, 100, 100, 100, 95, 95, 95, 65, 80, 80, 80, 95, 95, 95, 95, 95, 120, 120, 120, 120],
  'beni suef': [85, 85, 85, 100, 100, 100, 100, 100, 100, 100, 100, 95, 95, 95, 80, 65, 80, 80, 95, 95, 95, 95, 95, 120, 120, 120, 120],
  minya: [85, 85, 85, 100, 100, 100, 100, 100, 100, 100, 100, 95, 95, 95, 80, 80, 65, 80, 95, 95, 95, 95, 95, 120, 120, 120, 120],
  assiut: [85, 85, 85, 100, 100, 100, 100, 100, 100, 100, 100, 95, 95, 95, 80, 80, 80, 65, 95, 95, 95, 95, 95, 120, 120, 120, 120],
  sohag: [110, 110, 110, 115, 115, 115, 115, 115, 115, 115, 115, 110, 110, 110, 95, 95, 95, 95, 65, 85, 85, 85, 85, 120, 120, 120, 120],
  qena: [110, 110, 110, 115, 115, 115, 115, 115, 115, 115, 115, 110, 110, 110, 95, 95, 95, 95, 85, 65, 85, 85, 85, 120, 120, 120, 120],
  aswan: [110, 110, 110, 115, 115, 115, 115, 115, 115, 115, 115, 110, 110, 110, 95, 95, 95, 95, 85, 85, 65, 85, 85, 120, 120, 120, 120],
  luxor: [110, 110, 110, 115, 115, 115, 115, 115, 115, 115, 115, 110, 110, 110, 95, 95, 95, 95, 85, 85, 85, 65, 85, 120, 120, 120, 120],
  'red sea': [110, 110, 110, 115, 115, 115, 115, 115, 115, 115, 115, 110, 110, 110, 95, 95, 95, 95, 85, 85, 85, 85, 65, 120, 120, 120, 120],
  matrouh: [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 65, 120, 120, 120],
  'new valley': [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 65, 120, 120],
  'north sinai': [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 65, 120],
  'south sinai': [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 65],
};

// Full origin -> destination table (first 1,000 g, EGP, before VAT).
export const EGYPT_POST_MATRIX: Record<string, Record<string, number>> = Object.fromEntries(
  Object.entries(BASE_RATE_ROWS).map(([origin, row]) => [
    origin,
    Object.fromEntries(GOVERNORATES.map((destination, i) => [destination, row[i]])),
  ])
);

export interface EgyptPostShippingOptions {
  origin?: string;
  destination: string;
  weightGrams?: number;
}

/**
 * What the customer pays for one parcel: the Egypt Post list price (first
 * 1,000 g plus 7 EGP per extra 1,000 g or part of it), plus 14% VAT and the
 * 0.50 EGP stamp fee -- the sheet's "Estimated 1kg Total incl. VAT & Fee"
 * column for a 1 kg parcel -- plus the 5 EGP Brandyy handling fee.
 */
export function getEgyptPostShippingRate({
  origin = 'cairo',
  destination,
  weightGrams = 1000,
}: EgyptPostShippingOptions): number {
  const origKey = normalizeGovernorateName(origin);
  const destKey = normalizeGovernorateName(destination);

  const baseRate =
    (EGYPT_POST_MATRIX[origKey] ?? EGYPT_POST_MATRIX.cairo)[destKey] ?? DEFAULT_SHIPPING_BASE_RATE;

  // Weight surcharge: 7 EGP per additional 1,000g or fraction above 1,000g
  const overflowGrams = Math.max(0, weightGrams - EGYPT_POST_BASE_WEIGHT_GRAMS);
  const extraKg = Math.ceil(overflowGrams / 1000);
  const subtotal = baseRate + extraKg * EGYPT_POST_EXTRA_KG_RATE;

  const total = subtotal * (1 + EGYPT_POST_VAT_RATE) + EGYPT_POST_STAMP_FEE + SHIPPING_HANDLING_FEE;
  return Math.round(total * 100) / 100;
}

/**
 * Single source of truth for shipping rates by destination governorate (originating from Cairo).
 * Returns the customer price in EGP: Egypt Post total incl. VAT & stamp fee, plus the handling fee.
 */
export function getShippingRate(
  destinationGovernorate: string,
  originGovernorate: string = 'cairo',
  weightGrams: number = 1000
): number {
  return getEgyptPostShippingRate({
    origin: originGovernorate,
    destination: destinationGovernorate,
    weightGrams,
  });
}

// Quick lookup object mapping destination governorates from Cairo to their estimated total EGP rates
export const SHIPPING_RATES: Record<string, number> = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return DEFAULT_SHIPPING_RATE;
      return getShippingRate(prop);
    },
  }
);

/**
 * Shipping for an order: every seller ships their own parcel from their
 * governorate, so the fee is the sum of one Egypt Post price per seller.
 */
export function getOrderShippingFee(
  destinationGovernorate: string,
  parcels: Array<{ originGovernorate?: string | null; weightGrams: number }>
): number {
  if (!parcels.length) return getShippingRate(destinationGovernorate);
  const total = parcels.reduce(
    (sum, p) =>
      sum +
      getShippingRate(
        destinationGovernorate,
        p.originGovernorate || 'cairo',
        p.weightGrams > 0 ? p.weightGrams : 1000
      ),
    0
  );
  return Math.round(total * 100) / 100;
}
