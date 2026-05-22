/**
 * POST /api/admin/test-email
 * Sends a test email via Resend to verify transactional delivery is working.
 * Body: { to: string }
 * Admin only.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { success: false, error: 'RESEND_API_KEY is not configured.' },
      { status: 503 }
    );
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
      <h1 style="font-size:20px;color:#1e3b8a;margin-bottom:8px">✅ Brandy — Mail delivery confirmed</h1>
      <p style="color:#475569">This test email confirms transactional delivery via Resend is working.</p>
      <p style="margin-top:20px;font-size:13px;color:#64748b">Sent at: ${now}</p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resendKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Brandy Test <noreply@brandy.eg>',
      to,
      subject: `[Brandy] Test email — ${now}`,
      html,
    }),
  });

  const data = (await res.json()) as { id?: string; message?: string };
  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: data.message ?? `Resend HTTP ${res.status}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, resendId: data.id, to, sentAt: now });
}
