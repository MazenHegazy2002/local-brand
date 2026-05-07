import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  
  const { subscription } = await req.json();
  const userId = (session.user as { id: string }).id;
  
  if (redis) {
    await redis.set(`push:${userId}`, JSON.stringify(subscription));
  }
  
  return NextResponse.json({ success: true });
}