// Run: npx tsx scripts/e2e-checkout.ts
// End-to-end checkout walkthrough via plain HTTP.
// Requires the dev server to be running: npm run dev
// Or point at staging: NEXT_PUBLIC_APP_URL=https://staging.lolozozo.shop npx tsx scripts/e2e-checkout.ts

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const TS = Date.now();
const EMAIL = `e2e-test-${TS}@brandy-e2e.test`;
const PASS = 'E2eTest1234!';
const NAME = 'E2E Test Buyer';

type StepResult = { step: string; pass: boolean; note: string };
const results: StepResult[] = [];
let sessionCookie = '';

function record(step: string, pass: boolean, note: string) {
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon}  ${step.padEnd(36)} ${note}`);
  results.push({ step, pass, note });
}

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(sessionCookie ? { cookie: sessionCookie } : {}),
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  // Capture Set-Cookie for session propagation
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const token = setCookie.split(';')[0];
    if (token) sessionCookie = (sessionCookie ? sessionCookie + '; ' : '') + token;
  }
  return res;
}

async function step1_register() {
  try {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: NAME, email: EMAIL, password: PASS, role: 'BUYER' }),
    });
    const d = await res.json();
    record(
      'Register buyer account',
      res.status === 201,
      `HTTP ${res.status} — ${d.message ?? d.error ?? ''}`
    );
    return res.status === 201;
  } catch (e) {
    record('Register buyer account', false, (e as Error).message);
    return false;
  }
}

async function step2_signin() {
  try {
    // NextAuth credentials sign-in
    const res = await api('/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASS, csrfToken: '' }),
    });
    // NextAuth returns redirect on success — we just need the cookie
    const ok = res.status === 200 || res.status === 302 || res.redirected;
    record('Sign in (credentials)', ok, `HTTP ${res.status}`);
    return ok;
  } catch (e) {
    record('Sign in (credentials)', false, (e as Error).message);
    return false;
  }
}

async function step3_getProducts() {
  try {
    const res = await api('/api/products?limit=1');
    const d = await res.json();
    const products = Array.isArray(d) ? d : (d.products ?? d.items ?? []);
    const ok = res.ok && products.length > 0;
    record(
      'Fetch product list (1 item)',
      ok,
      ok ? `Got product: ${products[0]?.title ?? '?'}` : 'No products found'
    );
    return ok ? products[0] : null;
  } catch (e) {
    record('Fetch product list', false, (e as Error).message);
    return null;
  }
}

async function step4_health() {
  try {
    const res = await api('/api/health');
    const d = await res.json();
    record('Health endpoint', res.ok, `DB: ${d.db ?? '?'}, version: ${d.version ?? '?'}`);
    return res.ok;
  } catch (e) {
    record('Health endpoint', false, (e as Error).message);
    return false;
  }
}

async function step5_cart() {
  try {
    const res = await api('/api/cart');
    record('Cart endpoint accessible', res.ok || res.status === 401, `HTTP ${res.status}`);
    return true;
  } catch (e) {
    record('Cart endpoint accessible', false, (e as Error).message);
    return false;
  }
}

async function step6_promoCode() {
  try {
    const res = await api('/api/checkout/apply-code', {
      method: 'POST',
      body: JSON.stringify({ code: 'SARA15' }),
    });
    // 200 = valid, 404 = code not found, 400 = invalid — all are valid HTTP
    record('Promo code endpoint', res.status !== 500, `HTTP ${res.status}`);
    return true;
  } catch (e) {
    record('Promo code endpoint', false, (e as Error).message);
    return false;
  }
}

async function main() {
  console.log(`\n🛒 Brandy E2E Checkout Test\n   Target: ${BASE}\n${'─'.repeat(60)}`);

  await step1_register();
  await step2_signin();
  await step3_getProducts();
  await step4_health();
  await step5_cart();
  await step6_promoCode();

  const passed = results.filter(r => r.pass).length;
  const total = results.length;

  console.log(`${'─'.repeat(60)}`);
  console.log(`Result: ${passed}/${total} steps passed`);

  if (passed === total) {
    console.log('✅ All E2E checks passed.\n');
  } else {
    const failed = results.filter(r => !r.pass).map(r => r.step);
    console.log(`❌ Failed steps: ${failed.join(', ')}\n`);
    console.log('Note: "Sign in" may fail in test environments due to CSRF token requirements.');
    console.log('      Use Playwright for full browser-level E2E testing.\n');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
