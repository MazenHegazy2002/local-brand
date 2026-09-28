import { NextResponse } from 'next/server';
import { getLoyaltyHistory } from '@/app/actions/loyalty';
import { getRequestUserId } from '@/lib/mobile-auth';

export async function GET(req: Request) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) {
      return NextResponse.json({ points: 0, message: 'Not authenticated' }, { status: 401 });
    }

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
