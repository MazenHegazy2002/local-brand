import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderForUser } from '@/lib/order-creator';

/**
 * POST /api/payment/fawry/callback
 *
 * Fawry server-to-server payment notification handler.
 * Fawry POSTs this when a customer pays at an outlet or via mobile wallet.
 *
 * Signature verification: SHA-256 of:
 *   merchantCode + merchantRefNum + paymentAmount + orderStatus + securityKey
 *
 * Env vars required:
 *   FAWRY_MERCHANT_CODE
 *   FAWRY_SECURITY_KEY
 */

function verifyFawrySignature(
  securityKey: string,
  merchantCode: string,
  merchantRefNum: string,
  paymentAmount: string,
  orderStatus: string,
  providedSignature: string
): boolean {
  const raw = merchantCode + merchantRefNum + paymentAmount + orderStatus + securityKey;
  const computed = crypto.createHash('sha256').update(raw).digest('hex');
  if (computed.length !== providedSignature.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(providedSignature.toLowerCase())
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const merchantCode = process.env.FAWRY_MERCHANT_CODE;
    const securityKey = process.env.FAWRY_SECURITY_KEY;

    if (!merchantCode || !securityKey) {
      console.error('[fawry/callback] FAWRY_MERCHANT_CODE or FAWRY_SECURITY_KEY not configured');
      return NextResponse.json({ message: 'Payment gateway not configured' }, { status: 500 });
    }

    const body = (await req.json()) as Record<string, unknown>;

    const merchantRefNum = String(body['merchantRefNum'] ?? '');
    const paymentAmount = String(body['paymentAmount'] ?? '');
    const orderStatus = String(body['orderStatus'] ?? '');
    const signature = String(body['signature'] ?? '');

    if (!merchantRefNum) {
      return NextResponse.json({ message: 'Missing merchantRefNum' }, { status: 400 });
    }

    // 1. Verify Fawry signature
    if (
      !verifyFawrySignature(
        securityKey,
        merchantCode,
        merchantRefNum,
        paymentAmount,
        orderStatus,
        signature
      )
    ) {
      console.error('[fawry/callback] Signature mismatch for', merchantRefNum);
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    // 2. Only handle successful payments
    if (orderStatus !== 'PAID') {
      // Fawry also sends UNPAID / EXPIRED / CANCELLED notifications — acknowledge but skip
      return NextResponse.json({ received: true, processed: false, orderStatus });
    }

    // 3. Idempotency
    const idempotencyKey = `fawry:${merchantRefNum}`;
    const existing = await prisma.order.findFirst({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({ success: true, orderId: existing.id, alreadyProcessed: true });
    }

    // 4. Distributed lock
    const { redis } = await import('@/lib/redis');
    const lockKey = `fawry:lock:${merchantRefNum}`;
    const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX').catch(() => 'OK');
    if (acquired !== 'OK') {
      return NextResponse.json({ message: 'Already being processed' }, { status: 409 });
    }

    try {
      // 5. Read the pending cart
      const pendingRaw = await redis.get(`fawry:pending:${merchantRefNum}`).catch(() => null);
      if (!pendingRaw) {
        console.error('[fawry/callback] No pending cart for', merchantRefNum);
        return NextResponse.json(
          { message: 'Pending payment record not found or expired' },
          { status: 410 }
        );
      }

      const pending = JSON.parse(pendingRaw) as {
        userId: string;
        cartItems: Array<{ id: string; qty: number }>;
        addressInfo?: { id?: string; governorate?: string };
        couponId?: string;
      };

      // 6. Create the order
      const result = await createOrderForUser(pending.userId, {
        items: pending.cartItems.map(c => ({ variantId: c.id, quantity: c.qty })),
        addressId: pending.addressInfo?.id,
        paymentMethod: 'FAWRY',
        couponCode: pending.couponId,
      });

      if (!result.success || !result.orderId) {
        return NextResponse.json(
          { message: result.error || 'Order creation failed after payment' },
          { status: 500 }
        );
      }

      // 7. Flip order to PAID
      try {
        await prisma.order.update({
          where: { id: result.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            paymentId: String(body['fawryRefNumber'] ?? ''),
            paymentChannel: 'FAWRY',
            idempotencyKey,
          },
        });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === 'P2002') {
          const doubleCheck = await prisma.order.findFirst({ where: { idempotencyKey } });
          if (doubleCheck) {
            return NextResponse.json({
              success: true,
              orderId: doubleCheck.id,
              alreadyProcessed: true,
            });
          }
        }
        throw e;
      }

      // 8. Clean up Redis
      await redis.del(`fawry:pending:${merchantRefNum}`).catch(() => {});

      return NextResponse.json({ success: true, orderId: result.orderId });
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[fawry/callback] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Callback processing failed' },
      { status: 500 }
    );
  }
}
