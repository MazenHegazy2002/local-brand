import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedTokens = await prisma.verificationToken.deleteMany({
      where: { expires: { lt: thirtyDaysAgo } }
    });

    const deletedPasswordTokens = await prisma.passwordResetToken.deleteMany({
      where: { expires: { lt: new Date() } }
    });

    return NextResponse.json({
      success: true,
      cleanedUp: {
        verificationTokens: deletedTokens.count,
        passwordResetTokens: deletedPasswordTokens.count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}