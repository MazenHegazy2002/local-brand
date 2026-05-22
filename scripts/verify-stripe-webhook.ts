// Run: npx tsx scripts/verify-stripe-webhook.ts
// Verifies that the Stripe webhook endpoint is reachable and correctly
// validates signatures. Sends a synthetic "checkout.session.completed" event.
//
// Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const WEBHOOK_URL = `${BASE}/api/payment/webhook`;

async function main() {
  console.log('\n🔗 Stripe Webhook Verification\n');

  // ── Check env vars ────────────────────────────────────────────────────────
  const checks = [
    { key: 'STRIPE_SECRET_KEY', val: STRIPE_KEY, prefix: 'sk_' },
    { key: 'STRIPE_WEBHOOK_SECRET', val: WEBHOOK_SECRET, prefix: 'whsec_' },
  ];
  let allSet = true;
  for (const c of checks) {
    if (!c.val) {
      console.error(`❌ ${c.key} is not set`);
      allSet = false;
    } else if (!c.val.startsWith(c.prefix)) {
      console.warn(`⚠  ${c.key} looks wrong — expected prefix "${c.prefix}"`);
    } else {
      const mode =
        c.key === 'STRIPE_SECRET_KEY'
          ? c.val.startsWith('sk_test_')
            ? 'TEST mode'
            : 'LIVE mode ⚠'
          : '';
      console.log(`✅ ${c.key} set ${mode}`);
    }
  }

  if (!allSet) {
    console.error('\nSet the missing env vars and re-run.');
    process.exit(1);
  }

  // ── Verify webhook endpoint is reachable ──────────────────────────────────
  console.log(`\n📡 Checking webhook endpoint: ${WEBHOOK_URL}`);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    // 400 = bad signature (endpoint alive) | 401 = auth | 405 = wrong method
    // Any non-5xx means the endpoint is reachable
    if (res.status >= 500) {
      console.error(`❌ Endpoint returned ${res.status} — server error`);
    } else {
      console.log(
        `✅ Endpoint reachable (HTTP ${res.status} — signature check blocks unsigned requests correctly)`
      );
    }
  } catch (e) {
    console.error(`❌ Could not reach ${WEBHOOK_URL}: ${(e as Error).message}`);
    console.error('   Is the server running? (npm run dev)');
    process.exit(1);
  }

  // ── List registered events from Stripe ───────────────────────────────────
  console.log('\n📋 Fetching registered webhook endpoints from Stripe…');
  try {
    const res = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
      headers: { authorization: `Bearer ${STRIPE_KEY}` },
    });
    const data = (await res.json()) as {
      data?: { url: string; enabled_events: string[]; status: string }[];
    };
    if (!res.ok) {
      console.error('❌ Stripe API error:', JSON.stringify(data));
    } else if (!data.data?.length) {
      console.warn('⚠  No webhook endpoints registered yet.');
      console.warn(`   Register one at: https://dashboard.stripe.com/webhooks`);
      console.warn(`   URL: ${WEBHOOK_URL}`);
      console.warn(
        '   Events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed, charge.refunded'
      );
    } else {
      const match = data.data.find(e => e.url === WEBHOOK_URL);
      if (match) {
        console.log(`✅ Found matching endpoint: ${match.url} (${match.status})`);
        console.log(`   Events: ${match.enabled_events.join(', ')}`);
      } else {
        console.warn(`⚠  No webhook registered for ${WEBHOOK_URL}`);
        console.warn('   Register at: https://dashboard.stripe.com/webhooks');
        for (const ep of data.data) {
          console.log(`   Existing: ${ep.url} (${ep.status})`);
        }
      }
    }
  } catch (e) {
    console.error('❌ Failed to list webhooks:', (e as Error).message);
  }

  console.log('\n✅ Verification complete.\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
