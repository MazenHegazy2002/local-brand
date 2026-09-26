/**
 * @jest-environment node
 *
 * Tests for Multi-Brand admin approval requirement and workflow
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    brand: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sellerProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: 'mock-email' }),
}));

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { updateBrandStatus } from '@/app/actions/seller';

const mockGetServerSession = getServerSession as unknown as jest.Mock<any>;

describe('Multi-Brand Admin Approval Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock<any>).mockResolvedValue({ id: 'admin-user-id' });
  });

  it('rejects updateBrandStatus if user is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'seller-user-id', role: 'SELLER' },
    });

    const result = await updateBrandStatus('brand-123', 'ACTIVE');
    expect(result).toEqual({ error: 'Unauthorized' });
  });

  it('approves a brand when admin calls updateBrandStatus', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'admin-user-id', role: 'ADMIN' },
    });

    (prisma.brand.update as jest.Mock<any>).mockResolvedValue({
      id: 'brand-123',
      name: 'Zara Local',
      status: 'ACTIVE',
      seller: {
        storeName: 'Test Store',
        user: { name: 'Seller User', email: 'seller@test.com' },
      },
    });

    (prisma.auditLog.create as jest.Mock<any>).mockResolvedValue({ id: 'log-1' });

    const result = await updateBrandStatus('brand-123', 'ACTIVE');
    expect(result.success).toBe(true);
    expect(result.brand?.status).toBe('ACTIVE');
    expect(prisma.brand.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'brand-123' },
        data: { status: 'ACTIVE' },
      })
    );
  });

  it('rejects a brand when admin calls updateBrandStatus with REJECTED', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'admin-user-id', role: 'ADMIN' },
    });

    (prisma.brand.update as jest.Mock<any>).mockResolvedValue({
      id: 'brand-456',
      name: 'Spam Brand',
      status: 'REJECTED',
      seller: {
        storeName: 'Test Store',
        user: { name: 'Seller User', email: 'seller@test.com' },
      },
    });

    const result = await updateBrandStatus('brand-456', 'REJECTED');
    expect(result.success).toBe(true);
    expect(result.brand?.status).toBe('REJECTED');
  });
});
