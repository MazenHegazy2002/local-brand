import { NextResponse } from 'next/server';
import { ESCROW_HOLD_DAYS } from '@/lib/constants';

// Daily cron retained for vercel.json schedule compatibility. The old
// `processEscrowPayouts` worker has been removed:
//
//   - Earnings are now derived on the fly from delivered order items
//     via `computeSellerEarnings()` (src/lib/seller-earnings.ts), so there's
//     nothing to "release" on a schedule.
//   - The legacy worker also wrote to `SellerProfile.balance`, which is
//     vestigial and would drift against the source-of-truth helper.
//
// If real bank-side disbursements are added later (e.g. Stripe Payouts), this
// is the right place to wire that worker in. Until then, we just answer 200
// so the cron monitor stays green.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    processed: 0,
    escrowDays: ESCROW_HOLD_DAYS,
    note:
      'Escrow is computed on read from delivered order items via computeSellerEarnings(). ' +
      'No batch payout work to do.',
    timestamp: new Date().toISOString(),
  });
}
