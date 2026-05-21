// Admin Marketing Campaigns API.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { CampaignChannel, CampaignStatus } from '@/generated/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const items = await prisma.marketingCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ items });
}

interface PostBody {
  name?: string;
  channel?: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
  audienceJson?: object;
  subject?: string;
  body?: string;
  ctaUrl?: string;
  templateKey?: string;
  scheduledAt?: string;
}
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as PostBody;
  if (!body.name || !body.channel || !body.body) {
    return NextResponse.json({ message: 'name, channel, body required' }, { status: 400 });
  }
  const created = await prisma.marketingCampaign.create({
    data: {
      name: body.name,
      channel: body.channel as CampaignChannel,
      audienceJson: JSON.stringify(body.audienceJson ?? {}),
      subject: body.subject ?? null,
      body: body.body,
      ctaUrl: body.ctaUrl ?? null,
      templateKey: body.templateKey ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      createdBy: admin.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: 'CAMPAIGN_CREATED',
      targetId: created.id,
      details: JSON.stringify({ name: created.name, channel: created.channel }),
    },
  });
  return NextResponse.json({ campaign: created });
}
