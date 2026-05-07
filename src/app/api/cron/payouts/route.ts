import { NextResponse } from 'next/server';
import { processEscrowPayouts } from '@/lib/utils';
import { ESCROW_HOLD_DAYS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processEscrowPayouts();
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      escrowDays: ESCROW_HOLD_DAYS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}