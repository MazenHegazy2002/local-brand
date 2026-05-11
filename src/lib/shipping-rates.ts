// ============================================================
// SHIPPING RATES (EGP) — Governorate-based
// Keys are the lowercase normalised form of the governorate value
// from src/lib/governorates.ts so they always match.
// ============================================================
export const SHIPPING_RATES: Record<string, number> = {
  // Greater Cairo + Alexandria
  'cairo': 40,
  'giza': 40,
  'qalyubia': 45,
  'alexandria': 55,

  // Delta region
  'sharqia': 50,
  'dakahlia': 55,
  'gharbia': 55,
  'monufia': 50,
  'beheira': 55,
  'kafr el sheikh': 60,
  'damietta': 60,

  // Canal cities
  'port said': 60,
  'ismailia': 65,
  'suez': 65,

  // Sinai
  'north sinai': 110,
  'south sinai': 120,

  // Upper Egypt
  'faiyum': 50,
  'beni suef': 50,
  'minya': 55,
  'assiut': 60,
  'sohag': 65,
  'qena': 70,
  'luxor': 80,
  'aswan': 80,

  // Frontier
  'red sea': 100,
  'new valley': 90,
  'marsa matrouh': 120,
};

export const DEFAULT_SHIPPING_RATE = 75;
export const FREE_SHIPPING_THRESHOLD = 500;
export const WEIGHT_SURCHARGE_THRESHOLD = 1000; // grams
export const WEIGHT_SURCHARGE_PER_500G = 10;
