import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminError } from '@/lib/admin-registration-alerts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, stack, path, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, error: 'Message required' }, { status: 400 });
    }

    await notifyAdminError({
      message,
      stack: typeof stack === 'string' ? stack : undefined,
      path: typeof path === 'string' ? path : undefined,
      context: typeof context === 'string' ? context : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/alerts/error] Error processing report:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
