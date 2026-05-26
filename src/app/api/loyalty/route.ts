import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLoyaltyHistory } from '@/app/actions/loyalty';
import { SessionUser } from '@/types';

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ points: 0, message: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as SessionUser).id;
    const data = await getLoyaltyHistory(userId, 50);

    return NextResponse.json(
      {
        points: data.currentPoints,
        pointsValue: data.pointsValue,
        history: data.history,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Loyalty API Error:', error);
    return NextResponse.json(
      { points: 0, history: [], message: 'Error fetching loyalty data' },
      { status: 500 }
    );
  }
}
