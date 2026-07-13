import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.sessionToken || !body.path) {
      return NextResponse.json({ error: 'Missing required tracking details' }, { status: 400 });
    }

    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : headersList.get('x-real-ip') || '127.0.0.1';

    const log = await prisma.trafficLog.create({
      data: {
        sessionToken: body.sessionToken,
        path: body.path,
        referrer: body.referrer,
        userAgent,
        ipAddress,
        loadTimeMs: body.loadTimeMs ? parseInt(body.loadTimeMs) : null,
        userId: body.userId,
      },
    });

    return NextResponse.json({ id: log.id }, { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[tracker] Logging failed:', error);
    return NextResponse.json({ error: 'Tracking system error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: 'Missing tracking log ID' }, { status: 400 });
    }

    const logId = body.id;
    const durationSec = parseInt(body.durationSec) || 0;

    await prisma.trafficLog.update({
      where: { id: logId },
      data: { durationSec },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[tracker] Heartbeat update failed:', error);
    return NextResponse.json({ error: 'Tracking system error' }, { status: 500 });
  }
}
