/**
 * PaySky OMNI Gateway — PayForm Plus integration helpers.
 *
 * Docs: https://paysky.io/docs/paysky-omni-gateway-payform-plus-integration-guide/
 *
 * Flow:
 *   1. Server builds Lightbox parameters (Amount in piasters, MerchantId, TerminalId,
 *      MerchantReference, TrxDateTime "yyyyMMddHHmm").
 *   2. Server signs the request with SHA-256 HMAC (key = hex-decoded merchant secret).
 *   3. Client loads Lightbox.js (test or production) and calls `Lightbox.Checkout.showLightbox()`
 *      with the signed config.
 *   4. PaySky's success/error callback returns `SecureHash` that we MUST verify server-side
 *      before marking the order as PAID.
 */

import crypto from 'crypto';

export const PAYSKY_LIGHTBOX_TEST_URL =
  'https://grey.paysky.io:9006/invchost/JS/LightBox.js';
export const PAYSKY_LIGHTBOX_PROD_URL =
  'https://cube.paysky.io:6006/js/LightBox.js';

export type PaySkyEnv = 'test' | 'production';

export function getPaySkyLightboxUrl(env: PaySkyEnv): string {
  return env === 'production' ? PAYSKY_LIGHTBOX_PROD_URL : PAYSKY_LIGHTBOX_TEST_URL;
}

/** Returns the configured PaySky environment based on env vars. */
export function getPaySkyEnv(): PaySkyEnv {
  const v = (process.env.PAYSKY_ENV || '').toLowerCase();
  return v === 'production' || v === 'prod' || v === 'live' ? 'production' : 'test';
}

/** Format a date as PaySky's required `yyyyMMddHHmm`. */
export function formatPaySkyDate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}`;
}

/** Convert EGP (decimal) to piasters (integer string) as PaySky expects. */
export function toPiasters(amountEGP: number): string {
  return Math.round(amountEGP * 100).toString();
}

/**
 * Build the canonical "name=value&name=value" string from a sorted list of fields.
 * PaySky's spec: keys sorted alphabetically (case-sensitive ascending), joined with `&`,
 * values appended after `=` (no URL encoding).
 */
export function canonicalize(fields: Record<string, string | number>): string {
  return Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('&');
}

/**
 * SHA-256 HMAC of `payload` keyed by the hex-decoded `merchantSecret`.
 * Returns uppercase hex digest as required by PaySky.
 */
export function hmacSha256Hex(merchantSecret: string, payload: string): string {
  const key = Buffer.from(merchantSecret, 'hex');
  return crypto.createHmac('sha256', key).update(payload, 'utf8').digest('hex').toUpperCase();
}

export interface LightboxRequestParams {
  Amount: string; // piasters
  DateTimeLocalTrxn: string; // yyyyMMddHHmm
  MerchantId: string;
  MerchantReference: string;
  TerminalId: string;
}

/**
 * Generate the SecureHash for the LightBox request.
 * Hashed fields (sorted): Amount, DateTimeLocalTrxn, MerchantId, MerchantReference, TerminalId.
 */
export function signLightboxRequest(
  merchantSecret: string,
  params: LightboxRequestParams
): string {
  const payload = canonicalize({
    Amount: params.Amount,
    DateTimeLocalTrxn: params.DateTimeLocalTrxn,
    MerchantId: params.MerchantId,
    MerchantReference: params.MerchantReference,
    TerminalId: params.TerminalId,
  });
  return hmacSha256Hex(merchantSecret, payload);
}

/**
 * Verify the SecureHash returned by PaySky's success/error callback.
 * Per spec: include ALL response fields except `SecureHash`, sort keys alphabetically,
 * compute HMAC, compare in constant-time (uppercase hex).
 */
export function verifyCallbackHash(
  merchantSecret: string,
  callbackData: Record<string, unknown>
): boolean {
  const provided =
    typeof callbackData.SecureHash === 'string' ? callbackData.SecureHash : '';
  if (!provided) return false;

  const filtered: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(callbackData)) {
    if (k === 'SecureHash') continue;
    if (v === null || v === undefined || v === '') continue;
    filtered[k] = typeof v === 'number' ? v : String(v);
  }

  const expected = hmacSha256Hex(merchantSecret, canonicalize(filtered));

  // Constant-time compare to prevent timing attacks
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided.toUpperCase(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Make a unique merchant reference for an order (max 50 chars).
 * Format: `LB-<userPrefix>-<timestamp36>` (24 chars or so).
 */
export function buildMerchantReference(prefix?: string): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const head = prefix ? prefix.slice(0, 12).replace(/[^A-Z0-9]/gi, '') : 'LB';
  return `${head}-${time}-${rand}`.slice(0, 50);
}

/**
 * Server-side validation of PaySky env vars. Throws with a helpful message in
 * production if anything is missing.
 */
export function getPaySkyConfig(): {
  merchantId: string;
  terminalId: string;
  merchantSecret: string;
  env: PaySkyEnv;
} | null {
  const merchantId = process.env.PAYSKY_MERCHANT_ID;
  const terminalId = process.env.PAYSKY_TERMINAL_ID;
  const merchantSecret = process.env.PAYSKY_MERCHANT_SECRET;
  if (!merchantId || !terminalId || !merchantSecret) return null;
  return { merchantId, terminalId, merchantSecret, env: getPaySkyEnv() };
}
