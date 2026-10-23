// Admin Support Tickets inbox API.
import { NextResponse } from 'next/server';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { TicketStatus } from '@/generated/client';
import { getRequestSession } from '@/lib/mobile-auth';

export async function GET(req: Request) {
  const session = await getRequestSession(req);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as TicketStatus | null;
  const items = await prisma.supportTicket.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ items });
}

// PATCH { id, status?, adminReply? } — update a ticket's status and/or reply note.
export async function PATCH(req: Request) {
  const session = await getRequestSession(req);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: TicketStatus;
    adminReply?: string;
  };
  if (!body.id || (!body.status && body.adminReply === undefined)) {
    return NextResponse.json({ message: 'id and status or adminReply required' }, { status: 400 });
  }
  if (body.adminReply !== undefined && typeof body.adminReply !== 'string') {
    return NextResponse.json({ message: 'adminReply must be text' }, { status: 400 });
  }
  if (body.status && !Object.values(TicketStatus).includes(body.status)) {
    return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
  }
  const exists = await prisma.supportTicket.findUnique({
    where: { id: body.id },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
  const ticket = await prisma.supportTicket.update({
    where: { id: body.id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.adminReply !== undefined ? { adminReply: body.adminReply.slice(0, 5000) } : {}),
    },
  });
  return NextResponse.json({ ticket });
}

// DELETE ?id=<id> — permanently remove a ticket (spam, tests).
export async function DELETE(req: Request) {
  const session = await getRequestSession(req);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 });
  const { count } = await prisma.supportTicket.deleteMany({ where: { id } });
  if (!count) return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
