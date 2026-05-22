import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ points: 0, message: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as SessionUser).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, name: true, email: true },
    });

    return NextResponse.json(
      {
        points: user?.loyaltyPoints || 0,
        user: { name: user?.name, email: user?.email },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Loyalty API Error:', error);
    return NextResponse.json(
      { points: 0, message: 'Error fetching loyalty data' },
      { status: 500 }
    );
  }
}
