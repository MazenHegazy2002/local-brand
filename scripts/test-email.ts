// Run: npx tsx scripts/test-email.ts
// Sends a test email via Resend to verify transactional mail is working.
// Requires: RESEND_API_KEY and UPTIME_ALERT_EMAIL env vars.

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO = process.env.UPTIME_ALERT_EMAIL ?? process.env.TEST_EMAIL;

async function main() {
  console.log('\n📧 Brandy transactional mail test\n');

  if (!RESEND_KEY) {
    console.error('❌ RESEND_API_KEY is not set. Add it to your .env and try again.');
    process.exit(1);
  }
  if (!TO) {
    console.error('❌ Set UPTIME_ALERT_EMAIL (or TEST_EMAIL) to the recipient address.');
    process.exit(1);
  }

  const now = new Date().toISOString();
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:20px;color:#1e3b8a;margin-bottom:8px">✅ Brandy — Mail delivery confirmed</h1>
      <p style="color:#475569">This email confirms that transactional mail via Resend is working correctly.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
        <tr><td style="padding:6px 8px;color:#64748b">Sent at</td><td style="padding:6px 8px">${now}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:6px 8px;color:#64748b">RESEND_API_KEY</td><td style="padding:6px 8px">✅ set (${RESEND_KEY.slice(0, 8)}…)</td></tr>
        <tr><td style="padding:6px 8px;color:#64748b">Recipient</td><td style="padding:6px 8px">${TO}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">Brandy Egyptian Marketplace — automated test</p>
    </div>`;

  console.log(`Sending to: ${TO}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'Brandy Test <noreply@brandy.eg>',
      to: TO,
      subject: `[Brandy] Transactional mail test — ${now}`,
      html,
    }),
  });

  const data = (await res.json()) as { id?: string; name?: string; message?: string };
  if (!res.ok) {
    console.error(`❌ Resend error ${res.status}: ${data.message ?? JSON.stringify(data)}`);
    process.exit(1);
  }

  console.log(`✅ Email sent! Resend ID: ${data.id}`);
  console.log('   Check your inbox — delivery usually takes < 5 seconds.\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
