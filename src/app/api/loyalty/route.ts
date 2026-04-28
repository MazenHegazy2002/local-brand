import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/loyalty — fetch user's points balance and history
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, name: true }
    });

    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    // Tier system
    const points = user.loyaltyPoints;
    const tier = points >= 10000 ? 'Platinum' : points >= 5000 ? 'Gold' : points >= 1000 ? 'Silver' : 'Bronze';
    const nextTierThreshold = tier === 'Bronze' ? 1000 : tier === 'Silver' ? 5000 : tier === 'Gold' ? 10000 : null;
    const pointsToNextTier = nextTierThreshold ? nextTierThreshold - points : null;

    // Redemption rate: 100 points = 10 EGP
    const redemptionValueEGP = Math.floor(points / 100) * 10;

    return NextResponse.json({
      points,
      tier,
      pointsToNextTier,
      redemptionValueEGP,
      message: `You have ${points} LocalCoins worth up to ${redemptionValueEGP} EGP`
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
