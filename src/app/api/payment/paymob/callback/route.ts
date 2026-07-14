import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderForUser } from '@/lib/order-creator';

/**
 * POST /api/payment/paymob/callback
 *
 * Handles PayMob"s "Transaction Processed Callback" (server-to-server webhook)
 * AND the client-redirect after the iframe closes.
 *
 * IMPORTANT: The HMAC is verified before any order state is changed.
 * Never trust the `success` flag from the client alone.
 *
 * Env vars required:
 *   PAYMOB_HMAC_SECRET  — the HMAC secret from your PayMob dashboard
 */

/** Verifies PayMob"s HMAC-SHA512 over the flattened callback fields. */
function verifyPayMobHmac(secret: string, flat: Record<string, string>): boolean {
  // PayMob specifies a fixed set of fields that contribute to the HMAC string.
  const fields = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ];
  const message = fields.map(f => flat[f] ?? '').join('');
  const computed = crypto.createHmac('sha512', secret).update(message).digest('hex');
  const provided = (flat['hmac'] ?? '').toLowerCase();
  if (computed.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(provided));
  } catch {
    return false;
  }
}

/** Flatten a nested object using dot-notation keys (PayMob convention). */
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v as Record<string, unknown>, key));
    } else {
      result[key] = String(v ?? '');
    }
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret) {
      console.error('[paymob/callback] PAYMOB_HMAC_SECRET not configured');
      return NextResponse.json({ message: 'Payment gateway not configured' }, { status: 500 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const flat = flattenObject(body);

    // 1. Verify HMAC signature — reject anything that does not pass
    if (!verifyPayMobHmac(hmacSecret, flat)) {
      console.error('[paymob/callback] HMAC mismatch — rejecting');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    // 2. Only finalize successful, non-pending transactions
    if (flat['success'] !== 'true' || flat['pending'] === 'true') {
      return NextResponse.json({ received: true, processed: false });
    }

    const merchantOrderId = flat['order'] ?? '';
    if (!merchantOrderId) {
      return NextResponse.json({ message: 'Missing order reference' }, { status: 400 });
    }

    // 3. Idempotency — do not process the same PayMob transaction twice
    const idempotencyKey = `paymob:${merchantOrderId}`;
    const existing = await prisma.order.findFirst({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({ success: true, orderId: existing.id, alreadyProcessed: true });
    }

    // 4. Distributed lock to guard against duplicate webhook delivery
    const { redis } = await import('@/lib/redis');
    const lockKey = `paymob:lock:${merchantOrderId}`;
    const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX').catch(() => 'OK');
    if (acquired !== 'OK') {
      return NextResponse.json({ message: 'Already being processed' }, { status: 409 });
    }

    try {
      // 5. Read the pending cart cached at checkout time
      const pendingRaw = await redis.get(`paymob:pending:${merchantOrderId}`).catch(() => null);
      if (!pendingRaw) {
        console.error('[paymob/callback] No pending cart for', merchantOrderId);
        return NextResponse.json(
          { message: 'Pending payment record not found or expired' },
          { status: 410 }
        );
      }

      const pending = JSON.parse(pendingRaw) as {
        userId: string;
        cartItems: Array<{ id: string; qty: number }>;
        addressInfo?: { id?: string };
        couponId?: string;
      };

      // 6. Create the order (stock check, coupon, shipping are all handled inside)
      const result = await createOrderForUser(pending.userId, {
        items: pending.cartItems.map(c => ({ variantId: c.id, quantity: c.qty })),
        addressId: pending.addressInfo?.id,
        paymentMethod: 'PAYMOB',
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
            paymentId: flat['id'] || null,
            paymentChannel: flat['source_data.type'] || null,
            paymentMaskedPan: flat['source_data.pan'] || null,
            idempotencyKey,
          },
        });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === 'P2002') {
          // Unique constraint: another callback already won the race
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
      await redis.del(`paymob:pending:${merchantOrderId}`).catch(() => {});

      return NextResponse.json({ success: true, orderId: result.orderId });
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[paymob/callback] Error:', err);
    return NextResponse.json(
      { message: err.message || 'Callback processing failed' },
      { status: 500 }
    );
  }
}

// PayMob hits this URL with GET for endpoint verification in the dashboard
export async function GET() {
  return NextResponse.json({ ok: true });
}
