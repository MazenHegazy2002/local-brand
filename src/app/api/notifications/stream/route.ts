import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subscribeToNotifications } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`));

        let unsubscribe: (() => void) | null = null;
        
        subscribeToNotifications(userId, (notification) => {
          try {
            controller.enqueue(encoder.encode(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`));
          } catch {}
        }).then((unsub) => {
          unsubscribe = unsub;
        });

        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch {
            clearInterval(keepAlive);
            unsubscribe?.();
          }
        }, 30000);

        req.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          unsubscribe?.();
          try {
            controller.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}