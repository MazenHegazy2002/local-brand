import { prisma } from './prisma';
import { getSetting } from './admin-settings-registry';

/**
 * Generates the standard message text sent to the customer.
 */
export function getWhatsAppConfirmationText(orderId: string, totalAmount: number): string {
  return `Welcome to Brandy! Please confirm your order #${orderId.substring(0, 8)} of amount ${totalAmount.toFixed(2)} EGP.\n\nReply:\n*1* to Confirm\n*2* to Cancel`;
}

/**
 * Triggers order verification message to the customer's phone number.
 */
export async function sendWhatsAppConfirmation(
  orderId: string,
  phone: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const isEnabled = await getSetting<boolean>('WHATSAPP_BOT_ENABLED');
    if (!isEnabled) {
      return { success: false, error: 'WhatsApp bot is disabled in settings' };
    }

    const codOnly = await getSetting<boolean>('WHATSAPP_COD_ONLY');
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // If COD only is enabled, restrict triggers to CASH_ON_DELIVERY orders
    if (codOnly && order.paymentMethod !== 'CASH_ON_DELIVERY') {
      return { success: false, error: 'Skipped: WhatsApp confirmation is COD only' };
    }

    const apiKey = await getSetting<string>('WHATSAPP_API_KEY');
    const phoneNumberId = await getSetting<string>('WHATSAPP_PHONE_NUMBER_ID');

    // Normalize phone number (remove any non-digits)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('00')) {
      formattedPhone = formattedPhone.substring(2);
    }
    if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
      formattedPhone = '2' + formattedPhone;
    } else if (formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '20' + formattedPhone;
    }

    // ── MOCK MODE ──
    // If credentials are not set, run in mock simulator mode.
    if (!apiKey || !phoneNumberId) {
      const mockMsgId = `mock-msg-${crypto.randomUUID()}`;

      await prisma.order.update({
        where: { id: orderId },
        data: {
          whatsappConfirmStatus: 'PENDING_RESPONSE',
          whatsappMessageId: mockMsgId,
          whatsappLastSentAt: new Date(),
        },
      });

      console.log(
        `[WhatsApp MOCK] Sent order verification message to +${formattedPhone}. Msg ID: ${mockMsgId}`
      );
      return { success: true, messageId: mockMsgId };
    }

    // ── LIVE MODE (Meta Graph Cloud API) ──
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'order_confirmation', // Must be approved in Meta business console
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: orderId.substring(0, 8) },
              { type: 'text', text: `${order.totalAmount.toFixed(2)} EGP` },
            ],
          },
        ],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[WhatsApp Service] Meta API Error:', data);

      // Fallback: update status to error log so admin knows it failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          whatsappConfirmStatus: 'FAILED',
        },
      });

      return { success: false, error: data.error?.message || 'Meta API returned error status' };
    }

    const messageId = data.messages?.[0]?.id || `wamid.${crypto.randomUUID()}`;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        whatsappConfirmStatus: 'PENDING_RESPONSE',
        whatsappMessageId: messageId,
        whatsappLastSentAt: new Date(),
      },
    });

    console.log(
      `[WhatsApp Service] Sent order confirmation template to +${formattedPhone}. Msg ID: ${messageId}`
    );
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[WhatsApp Service] Exception:', error);
    return { success: false, error: error.message || 'Unknown execution error' };
  }
}
