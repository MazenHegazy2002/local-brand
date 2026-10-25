/**
 * @jest-environment node
 *
 * Tests for seller registration address requirements and sync
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAdminRegistrationEmailHtml } from '@/lib/admin-registration-alerts';

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn(async () => ({ limited: false })),
}));

const mockSendEmail = jest.fn(async (_args?: any) => ({ ok: true }));
const mockSendEmailDetailed = jest.fn(async (_args?: any) => ({ ok: true, provider: 'mock' }));
jest.mock('@/lib/email', () => ({
  sendEmail: (args: any) => mockSendEmail(args),
  sendEmailDetailed: (args: any) => mockSendEmailDetailed(args),
}));

import { POST } from '@/app/api/auth/register/route';

describe('POST /api/auth/register seller address requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.sellerProfile.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockImplementation(async (args: any) => ({
      id: 'new-seller-user-id',
      name: args.data.name,
      email: args.data.email,
      role: args.data.role,
    }));
    (prisma.sellerProfile.create as any).mockImplementation(async (args: any) => ({
      id: 'new-seller-profile-id',
      ...args.data,
    }));
    (prisma.user.findMany as any).mockResolvedValue([{ id: 'admin-1' }]);
    (prisma.order.updateMany as any).mockResolvedValue({ count: 0 });
    (prisma.passwordResetToken.create as any).mockResolvedValue({ id: 'prt1' });
  });

  it('rejects seller registration when pickup address is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Seller No Address',
        email: 'seller@example.com',
        password: 'password1234',
        role: 'SELLER',
        storeName: 'Brand Without Address',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Pickup Governorate is required/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects seller registration when storeName already exists', async () => {
    (prisma.sellerProfile.findUnique as any).mockResolvedValueOnce({ id: 'existing-store' });

    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Seller Dup',
        email: 'seller@example.com',
        password: 'password1234',
        role: 'SELLER',
        storeName: 'Existing Brand',
        governorate: 'Cairo',
        city: 'Nasr City',
        pickupStreet: '10 Makram Ebeid',
        pickupPhone: '+201012345678',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/already exists/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('successfully creates seller profile with pickup address and passes it to admin notification', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Seller Full',
        email: 'sellerfull@example.com',
        password: 'password1234',
        role: 'SELLER',
        storeName: 'Cairo Apparel',
        phone: '+201011111111',
        governorate: 'Giza',
        city: 'Dokki',
        pickupStreet: '15 Mossadak Street, 2nd floor, Apt 4',
        pickupBuilding: 'Near Shooting Club',
        pickupPhone: '+201022222222',
        pickupContactName: 'Omar Manager',
        pickupGeo: '30.0444, 31.2357',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    // Verify SellerProfile created with address fields
    expect(prisma.sellerProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'new-seller-user-id',
        storeName: 'Cairo Apparel',
        governorate: 'Giza',
        city: 'Dokki',
        pickupStreet: '15 Mossadak Street, 2nd floor, Apt 4',
        pickupBuilding: 'Near Shooting Club',
        pickupPhone: '+201022222222',
        pickupContactName: 'Omar Manager',
        pickupGeo: '30.0444, 31.2357',
        logisticsHub: 'المركز اللوجستي الرئيسي',
      }),
    });

    // Test that the admin registration email formatter displays the seller's location and pickup address
    const emailResult = generateAdminRegistrationEmailHtml(
      {
        type: 'SELLER',
        name: 'Seller Full',
        email: 'sellerfull@example.com',
        storeName: 'Cairo Apparel',
        governorate: 'Giza',
        city: 'Dokki',
        pickupStreet: '15 Mossadak Street, 2nd floor, Apt 4',
        pickupPhone: '+201022222222',
      },
      'https://brandyy.shop'
    );
    expect(emailResult.html).toContain('Dokki, Giza');
    expect(emailResult.html).toContain('15 Mossadak Street, 2nd floor, Apt 4');
    expect(emailResult.html).toContain('+201022222222');
  });
});
