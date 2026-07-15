import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';

const reportSchema = z.object({
  reason: z.enum(['INACCURATE', 'COUNTERFEIT', 'HARASSMENT', 'SPAM', 'OTHER']),
  message: z.string().min(10).max(1000),
});

function makeTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'T-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params;
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    const body = await req.json().catch(() => ({}));
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid report data', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Confirm product exists
    const product = await prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      select: { title: true },
    });
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const ticketId = makeTicketId();
    const reporterName = user?.name || 'Guest Reporter';
    const reporterEmail = user?.email || 'guest-report@brandyy.shop';

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId,
        userId: user?.id || null,
        name: reporterName,
        email: reporterEmail,
        subject: `[Product Report] "${product.title}" (${productId}) — ${parsed.data.reason}`,
        category: 'feedback',
        message: `Reported Product: ${product.title}\nID: ${productId}\nReason: ${parsed.data.reason}\n\nUser Message:\n${parsed.data.message}`,
        priority: 'high',
      },
    });

    return NextResponse.json(
      {
        message: 'Report submitted successfully. Thank you for keeping our marketplace safe.',
        ticket,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[product/report] error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
