/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@/lib/admin-settings-registry', () => ({
  __esModule: true,
  getSetting: jest.fn(),
}));

import { sendWhatsAppConfirmation } from '@/lib/whatsapp';
import { POST, GET } from '@/app/api/webhooks/whatsapp/route';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/admin-settings-registry';

const mockPrisma = prisma as any;
const mockGetSetting = getSetting as unknown as jest.Mock<any>;

describe('WhatsApp Confirmation Bot & Webhook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Webhook Verification Handshake', () => {
    it('verifies the handshake when tokens match', async () => {
      mockGetSetting.mockResolvedValue('my-token-123');
      const req = new Request(
        'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=my-token-123&hub.challenge=challenge123',
        {
          method: 'GET',
        }
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('challenge123');
    });

    it('rejects verification when tokens do not match', async () => {
      mockGetSetting.mockResolvedValue('my-token-123');
      const req = new Request(
        'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge123',
        {
          method: 'GET',
        }
      );
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  describe('sendWhatsAppConfirmation helper', () => {
    it('returns error when bot is disabled', async () => {
      mockGetSetting.mockImplementation(async (key: string) => {
        if (key === 'WHATSAPP_BOT_ENABLED') return false;
        return null;
      });

      const result = await sendWhatsAppConfirmation('order-1', '01012345678');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/disabled/i);
    });

    it('sends confirmation and updates status to PENDING_RESPONSE', async () => {
      mockGetSetting.mockImplementation(async (key: string) => {
        if (key === 'WHATSAPP_BOT_ENABLED') return true;
        if (key === 'WHATSAPP_COD_ONLY') return true;
        if (key === 'WHATSAPP_API_KEY') return '';
        if (key === 'WHATSAPP_PHONE_NUMBER_ID') return '';
        return null;
      });

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        paymentMethod: 'CASH_ON_DELIVERY',
        totalAmount: 150,
      });

      mockPrisma.order.update.mockResolvedValue({ id: 'order-1' });

      const result = await sendWhatsAppConfirmation('order-1', '01012345678');
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          whatsappConfirmStatus: 'PENDING_RESPONSE',
          whatsappMessageId: expect.any(String),
          whatsappLastSentAt: expect.any(Date),
        }),
      });
    });
  });

  describe('POST Webhook reply handler', () => {
    it('confirms the order on receiving confirmation code "1"', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          whatsappConfirmStatus: 'PENDING_RESPONSE',
          shippingAddressSnapshot: JSON.stringify({ phone: '01012345678' }),
        },
      ]);

      mockPrisma.order.update.mockResolvedValue({ id: 'order-1' });

      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '201012345678',
                      text: { body: '1' },
                      type: 'text',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const req = new Request('http://localhost/api/webhooks/whatsapp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          whatsappConfirmStatus: 'CONFIRMED',
          status: 'CONFIRMED',
        },
      });
    });

    it('cancels the order and restores stock on receiving "2"', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          whatsappConfirmStatus: 'PENDING_RESPONSE',
          shippingAddressSnapshot: JSON.stringify({ phone: '01012345678' }),
        },
      ]);

      const txOrderUpdate = jest.fn().mockResolvedValue({});
      const txOrderItemFindMany = jest
        .fn()
        .mockResolvedValue([{ variantId: 'variant-1', quantity: 2 }]);
      const txVariantUpdate = jest.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementation((fn: any) =>
        fn({
          order: { update: txOrderUpdate },
          orderItem: { findMany: txOrderItemFindMany },
          productVariant: { update: txVariantUpdate },
        })
      );

      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '201012345678',
                      text: { body: '2' },
                      type: 'text',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const req = new Request('http://localhost/api/webhooks/whatsapp', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(txOrderUpdate).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          whatsappConfirmStatus: 'CANCELLED',
          status: 'CANCELLED',
        },
      });

      expect(txVariantUpdate).toHaveBeenCalledWith({
        where: { id: 'variant-1' },
        data: {
          stockCount: { increment: 2 },
        },
      });
    });
  });
});
