// Run: npx tsx scripts/generate-secrets.ts
// Generates fresh values for every secret in .env.example.
// Copy-paste the output into your hosting environment's secret manager.

import crypto from 'crypto';

function b64(bytes: number) {
  return crypto.randomBytes(bytes).toString('base64');
}
function hex(bytes: number) {
  return crypto.randomBytes(bytes).toString('hex');
}

const secrets: Record<string, string> = {
  NEXTAUTH_SECRET: b64(32),
  CSRF_SECRET: b64(32),
  JWT_SECRET: b64(32),
  BCRYPT_PEPPER: hex(32),
  CRON_SECRET: b64(24),
  UPTIME_WEBHOOK_SECRET: b64(24),
  PAYMOB_HMAC_SECRET: hex(32),
  FAWRY_SECURITY_KEY: hex(32),
  PAYSKY_MERCHANT_SECRET: hex(32),
};

console.log('\n# ── Generated secrets — paste into your .env / Vercel / hosting secrets ──\n');
for (const [key, val] of Object.entries(secrets)) {
  console.log(`${key}="${val}"`);
}
console.log('\n# VAPID keys (requires web-push):');
console.log('#   npx web-push generate-vapid-keys --json');
console.log('#   Then set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY');
console.log('\n# ── IMPORTANT ──────────────────────────────────────────────────────────');
console.log('# 1. Do NOT commit these values to git.');
console.log('# 2. Set them in Vercel › Settings › Environment Variables (or your CI).');
console.log('# 3. Restart/redeploy after updating secrets.');
