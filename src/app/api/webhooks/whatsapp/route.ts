import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/admin-settings-registry';

/**
 * Normalizes phone numbers to a comparable 10-digit format for Egyptian phones (e.g. 10xxxxxxxx).
 */
function normalizePhone(p: string): string {
  const clean = p.replace(/\D/g, '');
  // If starts with 20 (Egypt country code) followed by 10 digits
  if (clean.startsWith('20') && clean.length === 12) {
    return clean.substring(2);
  }
  // If starts with 0 local prefix followed by 10 digits
  if (clean.startsWith('0') && clean.length === 11) {
    return clean.substring(1);
  }
  return clean;
}

/**
 * GET /api/webhooks/whatsapp
 *
 * Meta Webhook subscription verification handshake handler.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
      const configuredToken = await getSetting<string>('WHATSAPP_VERIFY_TOKEN');
      if (token === configuredToken) {
        console.log('[WhatsApp Webhook] Handshake verified successfully');
        return new Response(challenge, { status: 200 });
      }
    }

    return new Response('Forbidden', { status: 403 });
  } catch (e) {
    console.error('[WhatsApp Webhook] Handshake error:', e);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * POST /api/webhooks/whatsapp
 *
 * Handles incoming customer messages (responses to bot verification).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify incoming JSON structure from Meta Cloud API
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const val = changes?.value;
    const message = val?.messages?.[0];

    if (!message) {
      // Return 200 to acknowledge receipt of other webhooks (e.g. delivery receipts, read receipts)
      return NextResponse.json({ success: true, status: 'ignored' });
    }

    const senderPhone = message.from; // e.g. "201012345678"
    const textBody = (message.text?.body || '').trim().toLowerCase();
    const normalizedSender = normalizePhone(senderPhone);

    console.log(`[WhatsApp Webhook] Received message from +${senderPhone}: "${textBody}"`);

    // Find the latest order in PENDING_RESPONSE status for this customer phone number
    const pendingOrders = await prisma.order.findMany({
      where: { whatsappConfirmStatus: 'PENDING_RESPONSE' },
      orderBy: { createdAt: 'desc' },
    });

    let matchedOrder = null;
    for (const order of pendingOrders) {
      try {
        const address = JSON.parse(order.shippingAddressSnapshot);
        const orderPhone = address.phone || '';
        if (normalizePhone(orderPhone) === normalizedSender) {
          matchedOrder = order;
          break;
        }
      } catch {
        // Ignore JSON parse errors on snapshot
      }
    }

    if (!matchedOrder) {
      console.log(`[WhatsApp Webhook] No pending verification order found for +${senderPhone}`);
      return NextResponse.json({ success: true, error: 'No matching pending order' });
    }

    const isConfirm = ['1', 'confirm', 'yes', 'ok', 'نعم', 'تاكيد', 'تأكيد'].includes(textBody);
    const isCancel = ['2', 'cancel', 'no', 'cancellation', 'لا', 'الغاء', 'إلغاء'].includes(
      textBody
    );

    if (isConfirm) {
      // Transition order status to CONFIRMED
      await prisma.order.update({
        where: { id: matchedOrder.id },
        data: {
          whatsappConfirmStatus: 'CONFIRMED',
          status: 'CONFIRMED',
        },
      });

      console.log(`[WhatsApp Webhook] Order ${matchedOrder.id} CONFIRMED by customer reply`);

      // Mock reply dispatch
      await sendReply(
        senderPhone,
        `Thank you! Your order #${matchedOrder.id.substring(0, 8)} has been confirmed and is being processed.`
      );
    } else if (isCancel) {
      // Transition order status to CANCELLED and restore stock
      await prisma.$transaction(async tx => {
        await tx.order.update({
          where: { id: matchedOrder.id },
          data: {
            whatsappConfirmStatus: 'CANCELLED',
            status: 'CANCELLED',
          },
        });

        // Restore stock for all items in the order
        const items = await tx.orderItem.findMany({
          where: { orderId: matchedOrder.id },
        });

        for (const item of items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockCount: { increment: item.quantity },
            },
          });
        }
      });

      console.log(
        `[WhatsApp Webhook] Order ${matchedOrder.id} CANCELLED by customer reply; stock restored.`
      );

      // Mock reply dispatch
      await sendReply(
        senderPhone,
        `Your order #${matchedOrder.id.substring(0, 8)} has been cancelled. Thank you.`
      );
    } else {
      // Send fallback instruction prompt
      await sendReply(
        senderPhone,
        `Invalid response. Please reply with:\n*1* to Confirm\n*2* to Cancel\n\nFor order #${matchedOrder.id.substring(0, 8)}.`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Sends a reply back to the customer.
 */
async function sendReply(toPhone: string, text: string) {
  try {
    const apiKey = await getSetting<string>('WHATSAPP_API_KEY');
    const phoneNumberId = await getSetting<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!apiKey || !phoneNumberId) {
      console.log(`[WhatsApp Reply MOCK] Sending to +${toPhone}: "${text}"`);
      return;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: text },
      }),
    });
  } catch (err) {
    console.error('[WhatsApp Webhook] Failed to send reply message:', err);
  }
}
