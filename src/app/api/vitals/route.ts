import { NextResponse } from 'next/server';

/**
 * Web Vitals collection endpoint. Called by the <WebVitalsReporter /> component
 * from the client. In production, we forward to Vercel Analytics (which is
 * already configured). Locally, we just log for debugging.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    // Vercel Analytics already picks up metrics via the <Analytics /> component,
    // but we also log server-side for custom monitoring/alerting.
    if (process.env.NODE_ENV === 'production') {
      // Optionally forward to a custom logging service (e.g., Logtail, Axiom, Datadog)
      // For now we silently accept the event.
    } else if (process.env.DEBUG_VITALS === 'true') {
      console.log('[web-vitals]', body);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
