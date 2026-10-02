import crypto from 'crypto';

/**
 * Server-Side Event Dispatcher for Meta Conversions API (CAPI) & TikTok Events API
 */

export interface ServerPurchasePayload {
  orderId: string;
  totalAmount: number;
  currency?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  items?: Array<{
    id: string;
    title?: string;
    price: number;
    quantity: number;
  }>;
}

function hashString(val: string): string {
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

/**
 * Send Purchase event to Meta Conversions API (CAPI)
 */
export async function sendMetaCapiPurchaseEvent(payload: ServerPurchasePayload): Promise<boolean> {
  const pixelId =
    process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || '1150111797667939';
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN || process.env.FB_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    // Skipped: credentials not set
    return false;
  }

  try {
    const eventTime = Math.floor(Date.now() / 1000);

    const userData: Record<string, any> = {};

    if (payload.customerEmail) {
      userData.em = [hashString(payload.customerEmail)];
    }

    if (payload.customerPhone) {
      // Format phone digits only
      const cleanPhone = payload.customerPhone.replace(/[^0-9]/g, '');
      if (cleanPhone) {
        userData.ph = [hashString(cleanPhone)];
      }
    }

    if (payload.clientIp) {
      userData.client_ip_address = payload.clientIp;
    }

    if (payload.userAgent) {
      userData.client_user_agent = payload.userAgent;
    }

    const contents = (payload.items || []).map(item => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.price,
    }));

    const eventData: Record<string, any> = {
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: payload.orderId,
      action_source: 'website',
      event_source_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://brandyy.shop'}/checkout`,
      user_data: userData,
      custom_data: {
        currency: payload.currency || 'EGP',
        value: Number(payload.totalAmount) || 0,
        content_type: 'product',
        contents,
      },
    };

    const body: Record<string, any> = {
      data: [eventData],
    };

    if (testEventCode) {
      body.test_event_code = testEventCode;
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Meta CAPI Purchase Event failed:', res.status, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Meta CAPI dispatch exception:', err);
    return false;
  }
}

/**
 * Send Purchase event to TikTok Events API
 */
export async function sendTikTokEventsApiPurchase(
  payload: ServerPurchasePayload
): Promise<boolean> {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_EVENTS_API_TOKEN || process.env.TIKTOK_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return false;
  }

  try {
    const contents = (payload.items || []).map(item => ({
      content_id: item.id,
      price: item.price,
      quantity: item.quantity,
    }));

    const userObj: Record<string, string> = {};
    if (payload.customerEmail) userObj.email = hashString(payload.customerEmail);
    if (payload.customerPhone) {
      const cleanPhone = payload.customerPhone.replace(/[^0-9]/g, '');
      if (cleanPhone) userObj.phone_number = hashString(cleanPhone);
    }

    const body = {
      pixel_code: pixelId,
      event: 'CompletePayment',
      event_id: payload.orderId,
      timestamp: new Date().toISOString(),
      context: {
        user: userObj,
        ip: payload.clientIp || '',
        user_agent: payload.userAgent || '',
      },
      properties: {
        currency: payload.currency || 'EGP',
        value: Number(payload.totalAmount) || 0,
        contents,
      },
    };

    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('TikTok Events API Purchase failed:', res.status, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('TikTok Events API dispatch exception:', err);
    return false;
  }
}

/**
 * Single master function to trigger server-side purchase tracking across all enabled ad networks
 */
export async function dispatchServerPurchaseEvents(payload: ServerPurchasePayload) {
  try {
    await Promise.allSettled([
      sendMetaCapiPurchaseEvent(payload),
      sendTikTokEventsApiPurchase(payload),
    ]);
  } catch (err) {
    console.error('Error dispatching server purchase events:', err);
  }
}
