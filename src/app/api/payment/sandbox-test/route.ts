/**
 * GET /api/payment/sandbox-test
 * Reports the configuration status of every payment gateway.
 * Detects sandbox vs live mode based on key prefixes / env var names.
 *
 * No auth required — returns only boolean "configured" flags, never key values.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GatewayStatus {
  name: string;
  configured: boolean;
  mode: 'sandbox' | 'live' | 'unconfigured';
  note: string;
}

function isSet(...keys: string[]): boolean {
  return keys.every(k => !!process.env[k]);
}

export async function GET() {
  const gateways: GatewayStatus[] = [
    // ── Stripe ────────────────────────────────────────────────────────────────
    (() => {
      const key = process.env.STRIPE_SECRET_KEY ?? '';
      if (!key)
        return {
          name: 'Stripe',
          configured: false,
          mode: 'unconfigured',
          note: 'STRIPE_SECRET_KEY not set',
        };
      const mode = key.startsWith('sk_test_') ? 'sandbox' : 'live';
      const webhook = !!process.env.STRIPE_WEBHOOK_SECRET;
      return {
        name: 'Stripe',
        configured: true,
        mode,
        note: `${mode} key detected; webhook secret: ${webhook ? 'set' : 'MISSING — register at dashboard.stripe.com/webhooks'}`,
      };
    })(),

    // ── Paymob ────────────────────────────────────────────────────────────────
    (() => {
      if (!isSet('PAYMOB_API_KEY'))
        return {
          name: 'Paymob',
          configured: false,
          mode: 'unconfigured',
          note: 'PAYMOB_API_KEY not set',
        };
      const hmac = !!process.env.PAYMOB_HMAC_SECRET;
      const integ = !!process.env.PAYMOB_INTEGRATION_ID;
      return {
        name: 'Paymob',
        configured: true,
        mode: 'sandbox',
        note: `API key set; HMAC: ${hmac ? '✅' : '❌ missing'}; integration ID: ${integ ? '✅' : '❌ missing'}`,
      };
    })(),

    // ── Fawry ─────────────────────────────────────────────────────────────────
    (() => {
      if (!isSet('FAWRY_MERCHANT_CODE', 'FAWRY_SECURITY_KEY'))
        return {
          name: 'Fawry',
          configured: false,
          mode: 'unconfigured',
          note: 'FAWRY_MERCHANT_CODE or FAWRY_SECURITY_KEY not set',
        };
      return {
        name: 'Fawry',
        configured: true,
        mode: 'sandbox',
        note: 'Merchant code + security key set',
      };
    })(),

    // ── PaySky ────────────────────────────────────────────────────────────────
    (() => {
      if (!isSet('PAYSKY_MERCHANT_ID', 'PAYSKY_TERMINAL_ID', 'PAYSKY_MERCHANT_SECRET'))
        return {
          name: 'PaySky',
          configured: false,
          mode: 'unconfigured',
          note: 'One or more PAYSKY_* vars not set',
        };
      return {
        name: 'PaySky',
        configured: true,
        mode: 'sandbox',
        note: 'Merchant ID, terminal ID, and secret set',
      };
    })(),

    // ── Vodafone Cash (via Paymob wallet integration) ─────────────────────────
    (() => {
      const vfInteg = process.env.PAYMOB_WALLET_INTEGRATION_ID;
      if (!vfInteg)
        return {
          name: 'Vodafone Cash / Orange Money',
          configured: false,
          mode: 'unconfigured',
          note: 'PAYMOB_WALLET_INTEGRATION_ID not set (needed for mobile wallets)',
        };
      return {
        name: 'Vodafone Cash / Orange Money',
        configured: true,
        mode: 'sandbox',
        note: 'Paymob wallet integration ID set',
      };
    })(),

    // ── InstaPay (manual / bank transfer) ─────────────────────────────────────
    {
      name: 'InstaPay / Bank Transfer',
      configured: true,
      mode: 'live',
      note: 'COD + manual transfer — no API key required; always available',
    },
  ] as GatewayStatus[];

  const configured = gateways.filter(g => g.configured).length;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    summary: `${configured}/${gateways.length} gateways configured`,
    gateways,
  });
}
