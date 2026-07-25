import fs from 'fs';
import path from 'path';

// Load .env files if present
for (const file of ['.env.production', '.env.local', '.env']) {
  const envPath = path.join(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO = process.env.UPTIME_ALERT_EMAIL ?? process.env.TEST_EMAIL ?? 'mazentelda@gmail.com';

async function main() {
  console.log('\n📧 Brandy transactional mail test\n');

  if (!RESEND_KEY || RESEND_KEY.includes('re_your_key')) {
    console.error('❌ RESEND_API_KEY is not set or contains placeholder.');
    console.error('   Please replace "re_your_key_here" with your actual Resend API key (starts with "re_").');
    console.error('   You can find your API key at: https://resend.com/api-keys\n');
    console.error('   Command format:');
    console.error('   $env:RESEND_API_KEY="re_REAL_KEY_HERE"; npx tsx scripts/test-email.ts\n');
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
      from: 'Brandy Test <noreply@brandyy.shop>',
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
