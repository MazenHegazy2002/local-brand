import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const ticketSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(3).max(200),
  category: z.enum(['general', 'order', 'payment', 'return', 'seller', 'technical', 'feedback']).default('general'),
  message: z.string().min(10).max(2000),
});

function makeTicketId() {
  // Short, URL-safe, human-readable e.g. "T-A7B3K9M2"
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'T-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid ticket data', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session ? (session.user as SessionUser).id : null;

    const ticketId = makeTicketId();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId,
        userId,
        ...parsed.data,
      },
    });

    // Fire-and-forget email to support team + confirmation to user
    import('@/lib/email').then((m) => {
      m.sendEmail({
        to: parsed.data.email,
        subject: `[${ticketId}] We received your message — Brandy Support`,
        html: `
<p>Hi ${parsed.data.name},</p>
<p>Thanks for reaching out. Your ticket <strong>#${ticketId}</strong> has been logged and our team will get back to you within 24 hours (Sun-Thu).</p>
<p><strong>Subject:</strong> ${parsed.data.subject}</p>
<hr />
<p style="color:#666"><em>For urgent matters, you can also email us directly at support@brandy.com.</em></p>
<p>— Brandy Support Team</p>
        `,
      }).catch(() => { /* dev-mode console fallback handles this */ });
    }).catch(() => { /* ignore */ });

    return NextResponse.json(
      { success: true, ticketId: ticket.ticketId },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[support/ticket] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to submit ticket' },
      { status: 500 }
    );
  }
}

// GET /api/support/ticket — admins can list all tickets, users see their own
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const role = (session.user as SessionUser).role;
    const userId = (session.user as SessionUser).id;
    const email = session.user.email;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where = role === 'ADMIN'
      ? (status ? { status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' } : {})
      : { OR: [{ userId }, { email: email || undefined }] };

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[support/ticket] GET Error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to load tickets' },
      { status: 500 }
    );
  }
}
