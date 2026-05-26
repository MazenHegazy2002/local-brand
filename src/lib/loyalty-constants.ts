// ============================================================
// Loyalty programme constants
//
// These are split out from `src/app/actions/loyalty.ts` because that file
// is a `"use server"` module which is only allowed to export async
// functions — not plain values.
// ============================================================

/** Flat number of points awarded for every successful order. */
export const POINTS_PER_ORDER = 10;

/** Flat number of points awarded for a verified product review. */
export const POINTS_PER_REVIEW = 5;

/** Conversion rate when redeeming points at checkout. */
export const POINT_VALUE_EGP = 1;
