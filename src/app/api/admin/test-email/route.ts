/**
 * POST /api/admin/test-email
 * Sends a test email through the configured provider (SMTP or Resend).
 * Body: { to: string }
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmailDetailed } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let to: string;
  try {
    const body = await req.json();
    to = String(body.to ?? '').trim();
    if (!to || !to.includes('@')) throw new Error('invalid');
  } catch {
    return NextResponse.json(
      { success: false, error: 'Provide a valid "to" email in the body.' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px">
      <h1 style="font-size:20px;color:#1e3b8a;margin-bottom:8px">✅ Brandyy — Mail delivery confirmed</h1>
      <p style="color:#475569">This test email confirms transactional delivery is working.</p>
      <p style="margin-top:20px;font-size:13px;color:#64748b">Sent at: ${now}</p>
    </div>`;

  const result = await sendEmailDetailed({
    to,
    subject: `[Brandyy] Test email — ${now}`,
    html,
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, provider: result.provider, error: result.error ?? 'Send failed' },
      { status: result.provider === 'none' ? 503 : 502 }
    );
  }

  return NextResponse.json({ success: true, provider: result.provider, to, sentAt: now });
}
