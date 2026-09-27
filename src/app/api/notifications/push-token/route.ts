import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getMobileUser } from '@/lib/mobile-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Accept both session (web) and Bearer JWT (mobile)
  const session = await getServerSession(authOptions);
  const mobileUser = await getMobileUser(req);
  const userId = session?.user?.id ?? mobileUser?.id;

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return NextResponse.json({ error: 'Invalid Expo push token' }, { status: 400 });
  }

  await redis?.set(`push:token:${userId}`, token, 'EX', 60 * 60 * 24 * 60); // 60 days

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const mobileUser = await getMobileUser(req);
  if (!mobileUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await redis?.del(`push:token:${mobileUser.id}`);
  return NextResponse.json({ ok: true });
}
