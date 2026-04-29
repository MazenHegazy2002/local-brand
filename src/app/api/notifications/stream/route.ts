import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface SSEClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}

const clients = new Map<string, SSEClient>();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const clientId = crypto.randomUUID();

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        const client: SSEClient = {
          id: clientId,
          userId,
          controller,
        };
        clients.set(clientId, client);

        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch {
            clearInterval(keepAlive);
          }
        }, 30000);

        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId, userId })}\n\n`));

        req.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          clients.delete(clientId);
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
      },
    });
  } catch (error) {
    console.error('SSE Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export function sendNotification(userId: string, notification: any) {
  for (const [, client] of clients) {
    if (client.userId === userId) {
      try {
        const encoder = new TextEncoder();
        client.controller.enqueue(encoder.encode(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`));
      } catch (error) {
        clients.delete(client.id);
      }
    }
  }
}

export function broadcastToAll(notification: any) {
  for (const [, client] of clients) {
    try {
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`));
    } catch (error) {
      clients.delete(client.id);
    }
  }
}