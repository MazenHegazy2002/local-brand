// ============================================================
// EGYPT POST SHIPPING RATES (EGP) — Governorate & Weight-based Matrix
// Source of truth: Egypt_Post_Price_List_Updated-v2.xlsx
// 27 x 27 Symmetric Governorate Shipping Matrix
// ============================================================

export const EGYPT_POST_BASE_WEIGHT_GRAMS = 1000;
export const EGYPT_POST_EXTRA_KG_RATE = 7.0; // 7.00 EGP per extra 1000g or fraction
export const EGYPT_POST_VAT_RATE = 0.14; // 14% Egyptian VAT
export const EGYPT_POST_STAMP_FEE = 0.5; // 0.50 EGP administrative stamp fee

export const DEFAULT_SHIPPING_BASE_RATE = 65;
export const DEFAULT_SHIPPING_RATE = 65; // used when a governorate is unknown
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

// 27 x 27 Base Shipping Rate Matrix (First 1,000g / 1 kg in EGP)
// Egypt Post "Door to Door" price list (Easy box proposal): price for the
// first 1,000 g from the seller's governorate to the customer's governorate.
// Each additional 1,000 g (or part of it) costs EGYPT_POST_EXTRA_KG_RATE.
// The list groups governorates into regions with one price per region pair.
const REGION_OF: Record<string, string> = {
  cairo: 'metro',
  giza: 'metro',
  qalyubia: 'metro',
  alexandria: 'delta',
  beheira: 'delta',
  'kafr el sheikh': 'delta',
  gharbia: 'delta',
  monufia: 'delta',
  damietta: 'delta',
  dakahlia: 'delta',
  sharqia: 'delta',
  ismailia: 'canal',
  suez: 'canal',
  'port said': 'canal',
  faiyum: 'middle',
  'beni suef': 'middle',
  minya: 'middle',
  assiut: 'middle',
  sohag: 'upper',
  qena: 'upper',
  aswan: 'upper',
  luxor: 'upper',
  'red sea': 'upper',
  matrouh: 'remote',
  'new valley': 'remote',
  'north sinai': 'remote',
  'south sinai': 'remote',
};
const SAME_GOVERNORATE_RATE = 55;
const REMOTE_RATE = 110;
const REGION_RATES: Record<string, number> = {
  'metro|metro': 55,
  'metro|delta': 65,
  'metro|canal': 70,
  'metro|middle': 75,
  'metro|upper': 100,
  'delta|delta': 65,
  'delta|canal': 75,
  'delta|middle': 90,
  'delta|upper': 105,
  'canal|canal': 65,
  'canal|middle': 85,
  'canal|upper': 100,
  'middle|middle': 70,
  'middle|upper': 85,
  'upper|upper': 75,
};
const REGION_ORDER = ['metro', 'delta', 'canal', 'middle', 'upper', 'remote'];

function baseRateBetween(origin: string, destination: string): number {
  if (origin === destination && REGION_OF[origin]) return SAME_GOVERNORATE_RATE;
  const a = REGION_OF[origin] ?? 'metro';
  const b = REGION_OF[destination];
  if (!b) return DEFAULT_SHIPPING_BASE_RATE;
  if (a === 'remote' || b === 'remote') return REMOTE_RATE;
  const [x, y] = [a, b].sort((p, q) => REGION_ORDER.indexOf(p) - REGION_ORDER.indexOf(q));
  return REGION_RATES[`${x}|${y}`] ?? DEFAULT_SHIPPING_BASE_RATE;
}

// Full origin -> destination table (first 1,000 g, EGP).
export const EGYPT_POST_MATRIX: Record<string, Record<string, number>> = Object.fromEntries(
  Object.keys(REGION_OF).map(o => [
    o,
    Object.fromEntries(Object.keys(REGION_OF).map(d => [d, baseRateBetween(o, d)])),
  ])
);

export interface EgyptPostShippingOptions {
  origin?: string;
  destination: string;
  weightGrams?: number;
  includeVatAndFee?: boolean;
}

/**
 * Calculates the exact Egypt Post shipping rate using the official price matrix,
 * weight surcharge formula (7 EGP / extra 1,000g), 14% VAT, and 0.50 EGP stamp fee.
 */
export function getEgyptPostShippingRate({
  origin = 'cairo',
  destination,
  weightGrams = 1000,
  // The customer pays the list price; Egypt Post's own VAT and stamp fee are
  // the platform's cost, not added to the customer's shipping.
  includeVatAndFee = false,
}: EgyptPostShippingOptions): number {
  const origKey = normalizeGovernorateName(origin);
  const destKey = normalizeGovernorateName(destination);

  const baseRate = EGYPT_POST_MATRIX[origKey]?.[destKey] ?? DEFAULT_SHIPPING_BASE_RATE;

  // Weight surcharge: 7 EGP per additional 1,000g or fraction above 1,000g
  const overflowGrams = Math.max(0, weightGrams - EGYPT_POST_BASE_WEIGHT_GRAMS);
  const extraKg = Math.ceil(overflowGrams / 1000);
  const subtotal = baseRate + extraKg * EGYPT_POST_EXTRA_KG_RATE;

  if (!includeVatAndFee) {
    return subtotal;
  }

  // Total incl. 14% VAT & 0.50 EGP administrative stamp fee, rounded UP to next whole EGP
  const total = subtotal * (1 + EGYPT_POST_VAT_RATE) + EGYPT_POST_STAMP_FEE;
  return Math.ceil(Number(total.toFixed(4)));
}

/**
 * Single source of truth for shipping rates by destination governorate (originating from Cairo).
 * Returns estimated total rate in EGP including VAT & stamp fee.
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
  return parcels.reduce(
    (sum, p) =>
      sum +
      getShippingRate(
        destinationGovernorate,
        p.originGovernorate || 'cairo',
        p.weightGrams > 0 ? p.weightGrams : 1000
      ),
    0
  );
}
