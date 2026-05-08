// ============================================================
// SHIPPING RATES (EGP) — Governorate-based
// ============================================================
export const SHIPPING_RATES: Record<string, number> = {
  'cairo': 40,
  'giza': 40,
  'alexandria': 55,
  'aswan': 80,
  'luxor': 80,
  'portsaid': 60,
  'suez': 65,
  'ismailia': 65,
  'faiyum': 50,
  'beni suef': 50,
  'minya': 55,
  'assiut': 60,
  'sohag': 65,
  'qena': 70,
  'new valley': 90,
  'red sea': 100,
  'north sinai': 110,
  'south sinai': 120,
  'marsa matrouh': 120,
};

export const DEFAULT_SHIPPING_RATE = 75;
export const FREE_SHIPPING_THRESHOLD = 500;
export const WEIGHT_SURCHARGE_THRESHOLD = 1000; // grams
export const WEIGHT_SURCHARGE_PER_500G = 10;
