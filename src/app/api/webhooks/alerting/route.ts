/**
 * Uptime alerting webhook endpoint
 *
 * Accepts POST payloads from UptimeRobot, BetterUptime, or any compatible
 * uptime monitoring service, then forwards alerts via Resend email and/or
 * logs them to the AuditLog so they're visible in the admin panel.
 *
 * Setup instructions (one-time, operator):
 *  1. UptimeRobot:  My Monitors → Edit → Alert Contacts → Add "Webhook"
 *     URL: https://your-domain.com/api/webhooks/alerting
 *     POST body format: application/json
 *  2. BetterUptime: Settings → Integrations → Webhook
 *     URL: https://your-domain.com/api/webhooks/alerting
 *  3. Optional: set UPTIME_WEBHOOK_SECRET env var and pass it as a
 *     query param (?secret=...) to prevent unauthorised calls.
 *
 * Environment variables:
 *   UPTIME_WEBHOOK_SECRET   — optional shared secret
 *   UPTIME_ALERT_EMAIL      — email address to receive alerts (e.g. ops@brandy.eg)
 *   RESEND_API_KEY          — required for email delivery
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Best-effort type covering the common fields sent by UptimeRobot & BetterUptime
interface AlertPayload {
  // UptimeRobot fields
  monitorID?: string;
  monitorURL?: string;
  monitorFriendlyName?: string;
  alertType?: number | string; // 1=down, 2=up, 9=SSL expiry
  alertTypeFriendlyName?: string;
  alertDetails?: string;
  alertDuration?: number;
  // BetterUptime fields
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      url?: string;
      name?: string;
      status?: string;
      cause?: string;
      started_at?: string;
      resolved_at?: string;
    };
  };
  // Generic fallback
  status?: string;
  url?: string;
  name?: string;
  message?: string;
}

function summarise(payload: AlertPayload): { title: string; body: string; isDown: boolean } {
  // BetterUptime
  if (payload.data?.attributes) {
    const a = payload.data.attributes;
    const isDown = a.status === 'down' || !a.resolved_at;
    return {
      title: `[Brandy Uptime] ${isDown ? '🔴 DOWN' : '🟢 RECOVERED'}: ${a.name || a.url}`,
      body: `Monitor: ${a.name || a.url}\nStatus: ${a.status}\nCause: ${a.cause || '—'}\nStarted: ${a.started_at || '—'}\nResolved: ${a.resolved_at || '—'}`,
      isDown,
    };
  }

  // UptimeRobot
  const alertType = Number(payload.alertType);
  const isDown = alertType === 1;
  return {
    title: `[Brandy Uptime] ${isDown ? '🔴 DOWN' : '🟢 RECOVERED'}: ${payload.monitorFriendlyName || payload.monitorURL || 'Unknown monitor'}`,
    body: `Monitor: ${payload.monitorFriendlyName || '—'}\nURL: ${payload.monitorURL || '—'}\nEvent: ${payload.alertTypeFriendlyName || String(alertType)}\nDetails: ${payload.alertDetails || '—'}\nDowntime: ${payload.alertDuration ? `${payload.alertDuration}s` : '—'}`,
    isDown,
  };
}

export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.UPTIME_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const provided = url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
    if (provided !== secret) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  let payload: AlertPayload;
  try {
    payload = (await req.json()) as AlertPayload;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, body, isDown } = summarise(payload);

  // ── Log alert ───────────────────────────────────────────────────────────────
  // AuditLog requires a real User FK (adminId) so automated system events are
  // written to the application log instead.
  console.log(
    `[alerting webhook] ${isDown ? 'DOWN' : 'RECOVERED'} — monitor: ${
      payload.monitorID || payload.data?.id || 'unknown'
    }`
  );
  console.log('[alerting webhook]', body);

  // ── Send Email via Resend ───────────────────────────────────────────────────
  const alertEmail = process.env.UPTIME_ALERT_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (alertEmail && resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Brandy Alerts <alerts@brandy.eg>',
          to: alertEmail,
          subject: title,
          text: body,
          html: `<pre style="font-family:monospace;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</pre>`,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('[alerting webhook] Resend error:', err);
      }
    } catch (e) {
      console.error('[alerting webhook] Email send failed:', e);
    }
  }

  return NextResponse.json({ received: true, title });
}

// Health-check for the webhook endpoint itself
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    info: 'POST here with UptimeRobot / BetterUptime JSON payloads',
  });
}
