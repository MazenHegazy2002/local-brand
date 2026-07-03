/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/order-creator', () => ({
  createOrderForUser: jest.fn(),
}));

jest.mock('@/lib/paysky', () => ({
  verifyCallbackHash: jest.fn(() => true),
  getPaySkyConfig: jest.fn(() => ({
    merchantId: '123',
    terminalId: '456',
    merchantSecret: 'secret',
  })),
}));

import { POST } from '@/app/api/payment/paysky/callback/route';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { createOrderForUser } from '@/lib/order-creator';

const mockPrisma = prisma as any;
const mockRedis = redis as any;
const mockGetServerSession = getServerSession as jest.Mock<any>;
const mockCreateOrder = createOrderForUser as jest.Mock<any>;

describe('PaySky callback concurrency & race conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the first request to create the order and rejects concurrent requests with 409', async () => {
    // 1. Setup mock data
    mockGetServerSession.mockResolvedValue(null);
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockRedis.get.mockResolvedValue(
      JSON.stringify({
        userId: 'user-1',
        cartItems: [{ id: 'variant-1', qty: 1 }],
      })
    );
    mockCreateOrder.mockResolvedValue({ success: true, orderId: 'order-123' });

    // Mock Redis Lock implementation:
    // First set returns 'OK' (lock acquired), subsequent returns null (locked)
    let setCalls = 0;
    mockRedis.set.mockImplementation(async () => {
      setCalls++;
      if (setCalls === 1) return 'OK';
      return null;
    });

    // 2. Fire concurrent callbacks
    const body = {
      Amount: '100',
      Currency: '818',
      MerchantReference: 'ref-123',
      PaidThrough: 'Card',
      SecureHash: 'valid-hash',
      SystemReference: 'sys-123',
      TxnDate: '20260703',
    };

    const req1 = new Request('http://localhost/api/payment/paysky/callback', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const req2 = new Request('http://localhost/api/payment/paysky/callback', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

    // 3. Assertions
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(409);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.success).toBe(true);
    expect(data2.message).toMatch(/already being processed/i);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });
});
