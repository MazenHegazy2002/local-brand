import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser } from '@/types';
import { z } from 'zod';
import { getPaySkyConfig, verifyCallbackHash } from '@/lib/paysky';

/**
 * POST /api/payment/paysky/callback
 *
 * Called by the client after PaySky's Lightbox `completeCallback` fires.
 * We verify the SecureHash server-side, finalize the order with PAID status, then
 * return success so the client can redirect to /checkout/success.
 *
 * IMPORTANT: this endpoint MUST verify the hash. The client cannot be trusted to
 * tell us a payment succeeded without cryptographic proof from PaySky.
 */

const callbackSchema = z.object({
  // Required PaySky callback fields
  Amount: z.string(),
  Currency: z.string(),
  MerchantReference: z.string(),
  NetworkReference: z.string().optional(),
  PaidThrough: z.string(),
  PayerAccount: z.string().optional(),
  PayerName: z.string().optional(),
  ProviderSchemeName: z.string().optional(),
  SecureHash: z.string(),
  SystemReference: z.string(),
  TxnDate: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as SessionUser).id;
    const body = await req.json();
    const parsed = callbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid callback payload', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const config = getPaySkyConfig();
    if (!config) {
      return NextResponse.json(
        { message: 'PaySky is not configured on the server' },
        { status: 500 }
      );
    }

    // 1. Verify SecureHash signed by PaySky.
    //    PaySky sorts ALL response fields alphabetically (including MerchantId/TerminalId
    //    if present). Our spec requires us to also include MerchantId/TerminalId in the
    //    hash recomputation per the docs (ANNEX B section 5.2 example uses these fields).
    const verifiable: Record<string, string> = {
      Amount: parsed.data.Amount,
      Currency: parsed.data.Currency,
      MerchantId: config.merchantId,
      MerchantReference: parsed.data.MerchantReference,
      PaidThrough: parsed.data.PaidThrough,
      TerminalId: config.terminalId,
      TxnDate: parsed.data.TxnDate,
      SecureHash: parsed.data.SecureHash,
    };
    // Optional fields that PaySky may include
    if (parsed.data.NetworkReference) verifiable.NetworkReference = parsed.data.NetworkReference;
    if (parsed.data.PayerAccount) verifiable.PayerAccount = parsed.data.PayerAccount;
    if (parsed.data.PayerName) verifiable.PayerName = parsed.data.PayerName;
    if (parsed.data.ProviderSchemeName) verifiable.ProviderSchemeName = parsed.data.ProviderSchemeName;
    if (parsed.data.SystemReference) verifiable.SystemReference = parsed.data.SystemReference;

    const hashValid = verifyCallbackHash(config.merchantSecret, verifiable);
    if (!hashValid) {
      console.error('[paysky/callback] SecureHash mismatch for', parsed.data.MerchantReference);
      return NextResponse.json(
        { message: 'Invalid signature — payment cannot be confirmed' },
        { status: 400 }
      );
    }

    // 2. Idempotency: if we already finalized this MerchantReference, return success.
    const existing = await prisma.order.findFirst({
      where: { idempotencyKey: parsed.data.MerchantReference },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        orderId: existing.id,
        alreadyProcessed: true,
      });
    }

    // 3. Pull the pending cart from Redis.
    const { redis } = await import('@/lib/redis');
    const pendingKey = `paysky:pending:${parsed.data.MerchantReference}`;
    const pendingRaw = await redis.get(pendingKey).catch(() => null);
    if (!pendingRaw) {
      return NextResponse.json(
        { message: 'Pending payment not found or expired. Please contact support.' },
        { status: 410 }
      );
    }

    const pending = JSON.parse(pendingRaw) as {
      userId: string;
      cartItems: Array<{ id: string; qty: number }>;
      addressInfo?: { id?: string };
      couponId?: string;
    };

    if (pending.userId !== userId) {
      return NextResponse.json(
        { message: 'Payment session does not belong to this user' },
        { status: 403 }
      );
    }

    // 4. Create the order via the canonical createOrder flow, then mark it PAID.
    const { createOrder } = await import('@/app/actions/orders');
    const result = await createOrder({
      items: pending.cartItems.map((c) => ({ variantId: c.id, quantity: c.qty })),
      addressId: pending.addressInfo?.id,
      paymentMethod: 'PAYSKY',
      couponCode: pending.couponId,
    });

    if (!result.success || !result.orderId) {
      return NextResponse.json(
        { message: result.error || 'Order creation failed after payment' },
        { status: 500 }
      );
    }

    await prisma.order.update({
      where: { id: result.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentId: parsed.data.SystemReference,
        paymentChannel: parsed.data.PaidThrough,
        paymentNetworkRef: parsed.data.NetworkReference || null,
        paymentMaskedPan: parsed.data.PayerAccount || null,
        idempotencyKey: parsed.data.MerchantReference,
      },
    });

    // 5. Clear the pending cache.
    await redis.del(pendingKey).catch(() => {
      // ignore — pending data will expire on its own
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      systemReference: parsed.data.SystemReference,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[paysky/callback] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Failed to finalize PaySky payment' },
      { status: 500 }
    );
  }
}
