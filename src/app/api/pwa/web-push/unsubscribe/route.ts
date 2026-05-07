import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  
  const userId = (session.user as { id: string }).id;
  
  if (redis) {
    await redis.del(`push:${userId}`);
  }
  
  return NextResponse.json({ success: true });
}