/**
 * @jest-environment node
 *
 * Unit tests for GET /api/payment/sandbox-test
 *
 * Validates:
 *  - Response shape (gateways array, summary, checkedAt)
 *  - Stripe mode detection (sandbox vs live key prefix)
 *  - Each gateway reports "unconfigured" when its env vars are absent
 *  - InstaPay/Bank Transfer is always configured (no API key required)
 *  - Summary string format
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GET } from '@/app/api/payment/sandbox-test/route';

// All gateway-related env keys we'll manipulate in tests
const GATEWAY_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PAYMOB_API_KEY',
  'PAYMOB_HMAC_SECRET',
  'PAYMOB_INTEGRATION_ID',
  'PAYMOB_WALLET_INTEGRATION_ID',
  'FAWRY_MERCHANT_CODE',
  'FAWRY_SECURITY_KEY',
  'PAYSKY_MERCHANT_ID',
  'PAYSKY_TERMINAL_ID',
  'PAYSKY_MERCHANT_SECRET',
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  // Save and clear all gateway env vars so tests start from a clean slate
  for (const k of GATEWAY_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  // Restore
  for (const k of GATEWAY_KEYS) {
    if (saved[k] !== undefined) process.env[k] = saved[k];
    else delete process.env[k];
  }
});

type GatewayStatus = {
  name: string;
  configured: boolean;
  mode: 'sandbox' | 'live' | 'unconfigured';
  note: string;
};

type SandboxResponse = {
  checkedAt: string;
  summary: string;
  gateways: GatewayStatus[];
};

// ── Response shape ──────────────────────────────────────────────────────────

describe('response shape', () => {
  it('returns HTTP 200', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('includes a gateways array with at least one entry', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    expect(Array.isArray(body.gateways)).toBe(true);
    expect(body.gateways.length).toBeGreaterThan(0);
  });

  it('includes a summary string in the format "N/M gateways configured"', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    expect(body.summary).toMatch(/\d+\/\d+ gateways configured/);
  });

  it('includes a valid ISO checkedAt timestamp', async () => {
    const before = Date.now();
    const res = await GET();
    const after = Date.now();
    const body = (await res.json()) as SandboxResponse;
    const ts = new Date(body.checkedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('each gateway has name, configured, mode, and note fields', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    for (const gw of body.gateways) {
      expect(typeof gw.name).toBe('string');
      expect(typeof gw.configured).toBe('boolean');
      expect(['sandbox', 'live', 'unconfigured']).toContain(gw.mode);
      expect(typeof gw.note).toBe('string');
    }
  });
});

// ── Stripe ───────────────────────────────────────────────────────────────────

describe('Stripe gateway', () => {
  it('reports unconfigured when STRIPE_SECRET_KEY is absent', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const stripe = body.gateways.find(g => g.name === 'Stripe');
    expect(stripe).toBeDefined();
    expect(stripe!.configured).toBe(false);
    expect(stripe!.mode).toBe('unconfigured');
  });

  it('reports sandbox mode for sk_test_ key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123xyz';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const stripe = body.gateways.find(g => g.name === 'Stripe');
    expect(stripe!.configured).toBe(true);
    expect(stripe!.mode).toBe('sandbox');
  });

  it('reports live mode for sk_live_ key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc123xyz';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const stripe = body.gateways.find(g => g.name === 'Stripe');
    expect(stripe!.configured).toBe(true);
    expect(stripe!.mode).toBe('live');
  });

  it('warns about missing webhook secret in note', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    // STRIPE_WEBHOOK_SECRET is NOT set
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const stripe = body.gateways.find(g => g.name === 'Stripe');
    expect(stripe!.note).toMatch(/MISSING/i);
  });

  it('does not warn when webhook secret is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xyz';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const stripe = body.gateways.find(g => g.name === 'Stripe');
    expect(stripe!.note).not.toMatch(/MISSING/i);
  });
});

// ── Paymob ───────────────────────────────────────────────────────────────────

describe('Paymob gateway', () => {
  it('reports unconfigured when PAYMOB_API_KEY is absent', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const paymob = body.gateways.find(g => g.name === 'Paymob');
    expect(paymob!.configured).toBe(false);
  });

  it('reports configured when PAYMOB_API_KEY is set', async () => {
    process.env.PAYMOB_API_KEY = 'ak_test_123';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const paymob = body.gateways.find(g => g.name === 'Paymob');
    expect(paymob!.configured).toBe(true);
    expect(paymob!.mode).toBe('sandbox');
  });
});

// ── Fawry ────────────────────────────────────────────────────────────────────

describe('Fawry gateway', () => {
  it('reports unconfigured when either Fawry key is absent', async () => {
    process.env.FAWRY_MERCHANT_CODE = 'merchant123';
    // FAWRY_SECURITY_KEY is NOT set
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const fawry = body.gateways.find(g => g.name === 'Fawry');
    expect(fawry!.configured).toBe(false);
  });

  it('reports configured when both Fawry keys are set', async () => {
    process.env.FAWRY_MERCHANT_CODE = 'merchant123';
    process.env.FAWRY_SECURITY_KEY = 'seckey456';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const fawry = body.gateways.find(g => g.name === 'Fawry');
    expect(fawry!.configured).toBe(true);
  });
});

// ── PaySky ───────────────────────────────────────────────────────────────────

describe('PaySky gateway', () => {
  it('reports unconfigured when PaySky keys are absent', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const paysky = body.gateways.find(g => g.name === 'PaySky');
    expect(paysky!.configured).toBe(false);
  });

  it('reports configured when all PaySky keys are set', async () => {
    process.env.PAYSKY_MERCHANT_ID = 'mid';
    process.env.PAYSKY_TERMINAL_ID = 'tid';
    process.env.PAYSKY_MERCHANT_SECRET = 'secret';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const paysky = body.gateways.find(g => g.name === 'PaySky');
    expect(paysky!.configured).toBe(true);
    expect(paysky!.mode).toBe('sandbox');
  });
});

// ── InstaPay / Bank Transfer ─────────────────────────────────────────────────

describe('InstaPay / Bank Transfer gateway', () => {
  it('is always configured (no API key required)', async () => {
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const instapay = body.gateways.find(g => g.name.includes('InstaPay'));
    expect(instapay).toBeDefined();
    expect(instapay!.configured).toBe(true);
    expect(instapay!.mode).toBe('live');
  });
});

// ── Summary accuracy ─────────────────────────────────────────────────────────

describe('summary accuracy', () => {
  it('summary reflects actual configured count', async () => {
    // Only set Stripe — 2 gateways will be configured (Stripe + InstaPay)
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    const res = await GET();
    const body = (await res.json()) as SandboxResponse;
    const configuredCount = body.gateways.filter(g => g.configured).length;
    expect(body.summary).toContain(`${configuredCount}/`);
  });
});
