/* eslint-disable @typescript-eslint/no-unused-vars */
// tests/affiliate.test.ts
import { prisma } from '@/lib/prisma';
import {
  getTierConfig,
  getTierForConversions,
  getCommissionRate,
  getDiscountRate,
  getGlobalSettings,
  validatePromoCode,
  createPendingCommission,
  confirmCommission,
  cancelCommission,
  processReferralSignup,
  activateReferralBonuses,
  generatePromoCode,
  isPromoCodeAvailable,
} from '@/lib/affiliate';
import {
  AffiliateTier,
  AffiliateCommissionStatus,
  AffiliateBonusStatus,
  AffiliateBonusType,
} from '@/generated/client';

// Cast model mock properties
const affiliateMock = prisma.affiliate as any;
const tierConfigMock = prisma.affiliateTierConfig as any;
const settingsMock = prisma.affiliateGlobalSettings as any;
const promoUsageMock = prisma.promoCodeUsage as any;
const commissionMock = prisma.commission as any;
const referralMock = prisma.affiliateReferral as any;
const bonusMock = prisma.affiliateBonus as any;

describe('Affiliate Core Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tier Configurations & Calculations', () => {
    it('should return ordered tier configurations', async () => {
      const mockTiers = [
        { tier: AffiliateTier.STARTER, minConversions: 0, commissionPct: 5 },
        { tier: AffiliateTier.SILVER, minConversions: 20, commissionPct: 6 },
      ];
      tierConfigMock.findMany.mockResolvedValue(mockTiers);

      const result = await getTierConfig();
      expect(result).toEqual(mockTiers);
      expect(tierConfigMock.findMany).toHaveBeenCalledWith({ orderBy: { minConversions: 'asc' } });
    });

    it('should correctly resolve tier based on conversions count', async () => {
      const mockTiers = [
        { tier: AffiliateTier.STARTER, minConversions: 0 },
        { tier: AffiliateTier.SILVER, minConversions: 20 },
        { tier: AffiliateTier.GOLD, minConversions: 84 },
      ];
      tierConfigMock.findMany.mockResolvedValue(mockTiers);

      expect(await getTierForConversions(0)).toBe(AffiliateTier.STARTER);
      expect(await getTierForConversions(10)).toBe(AffiliateTier.STARTER);
      expect(await getTierForConversions(20)).toBe(AffiliateTier.SILVER);
      expect(await getTierForConversions(50)).toBe(AffiliateTier.SILVER);
      expect(await getTierForConversions(84)).toBe(AffiliateTier.GOLD);
      expect(await getTierForConversions(100)).toBe(AffiliateTier.GOLD);
    });
  });

  describe('Commission & Discount Rates', () => {
    it('should return custom commission pct if defined', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        tier: AffiliateTier.STARTER,
        customCommissionPct: 10.5,
      });

      const rate = await getCommissionRate('aff-1');
      expect(rate).toBe(10.5);
    });

    it('should return tier-based commission pct if custom is null', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        tier: AffiliateTier.SILVER,
        customCommissionPct: null,
      });
      tierConfigMock.findMany.mockResolvedValue([
        { tier: AffiliateTier.STARTER, commissionPct: 5 },
        { tier: AffiliateTier.SILVER, commissionPct: 6 },
      ]);

      const rate = await getCommissionRate('aff-1');
      expect(rate).toBe(6);
    });

    it('should fallback to 5% commission if no config found', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        tier: AffiliateTier.PLATINUM,
        customCommissionPct: null,
      });
      tierConfigMock.findMany.mockResolvedValue([]);

      const rate = await getCommissionRate('aff-1');
      expect(rate).toBe(5);
    });

    it('should return custom discount rate capped at global max discount', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        customDiscountPct: 25,
      });
      settingsMock.upsert.mockResolvedValue({
        maxDiscountPct: 20,
        defaultDiscountPct: 15,
      });

      const rate = await getDiscountRate('aff-1');
      expect(rate).toBe(20);
    });

    it('should return custom discount rate if under global max discount', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        customDiscountPct: 12,
      });
      settingsMock.upsert.mockResolvedValue({
        maxDiscountPct: 20,
        defaultDiscountPct: 15,
      });

      const rate = await getDiscountRate('aff-1');
      expect(rate).toBe(12);
    });

    it('should return default global discount rate if custom discount is null', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        customDiscountPct: null,
      });
      settingsMock.upsert.mockResolvedValue({
        maxDiscountPct: 20,
        defaultDiscountPct: 15,
      });

      const rate = await getDiscountRate('aff-1');
      expect(rate).toBe(15);
    });
  });

  describe('Promo Code Validation', () => {
    it('should reject if the affiliate program is disabled', async () => {
      settingsMock.upsert.mockResolvedValue({ programEnabled: false });

      const result = await validatePromoCode('CODE15', 1000, 'user-1');
      expect(result).toEqual({ valid: false, reason: 'Affiliate program is currently disabled.' });
    });

    it("should reject if promo code doesn't exist", async () => {
      settingsMock.upsert.mockResolvedValue({ programEnabled: true });
      affiliateMock.findUnique.mockResolvedValue(null);

      const result = await validatePromoCode('INVALID', 1000, 'user-1');
      expect(result).toEqual({ valid: false, reason: 'Invalid promo code.' });
    });

    it('should reject if affiliate is not ACTIVE', async () => {
      settingsMock.upsert.mockResolvedValue({ programEnabled: true });
      affiliateMock.findUnique.mockResolvedValue({ id: 'aff-1', status: 'PENDING' });

      const result = await validatePromoCode('CODE15', 1000, 'user-1');
      expect(result).toEqual({ valid: false, reason: 'This promo code is no longer active.' });
    });

    it('should reject if the buyer is trying to use their own code', async () => {
      settingsMock.upsert.mockResolvedValue({ programEnabled: true });
      affiliateMock.findUnique.mockResolvedValue({
        id: 'aff-1',
        status: 'ACTIVE',
        userId: 'user-1',
      });

      const result = await validatePromoCode('CODE15', 1000, 'user-1');
      expect(result).toEqual({ valid: false, reason: 'You cannot use your own promo code.' });
    });

    it('should reject if the buyer already used this code in a past order', async () => {
      settingsMock.upsert.mockResolvedValue({ programEnabled: true });
      affiliateMock.findUnique.mockResolvedValue({
        id: 'aff-1',
        status: 'ACTIVE',
        userId: 'user-2',
      });
      promoUsageMock.findFirst.mockResolvedValue({ id: 'usage-1' });

      const result = await validatePromoCode('CODE15', 1000, 'user-1');
      expect(result).toEqual({ valid: false, reason: 'You have already used this promo code.' });
    });

    it('should validate and return discount percentage and amount', async () => {
      settingsMock.upsert.mockResolvedValue({
        programEnabled: true,
        maxDiscountPct: 20,
        defaultDiscountPct: 15,
      });
      affiliateMock.findUnique.mockResolvedValue({
        id: 'aff-1',
        status: 'ACTIVE',
        userId: 'user-2',
        customDiscountPct: null,
      });
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        customDiscountPct: null,
      });
      promoUsageMock.findFirst.mockResolvedValue(null);

      const result = await validatePromoCode('CODE15', 1000, 'user-1');
      expect(result).toEqual({
        valid: true,
        affiliateId: 'aff-1',
        discountPct: 15,
        discountAmountEgp: 150,
      });
    });
  });

  describe('Commission Creation & Confirmation / Cancellation', () => {
    it('should create a pending commission with correct percentage and amount', async () => {
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        tier: AffiliateTier.STARTER,
        customCommissionPct: 5,
      });
      commissionMock.create.mockResolvedValue({ id: 'comm-1' });

      await createPendingCommission('order-1', 'aff-1', 1000);

      expect(commissionMock.create).toHaveBeenCalledWith({
        data: {
          affiliateId: 'aff-1',
          orderId: 'order-1',
          orderTotalEgp: 1000,
          commissionPct: 5,
          commissionEgp: 50,
          status: AffiliateCommissionStatus.PENDING,
        },
      });
    });

    it('should confirm pending commission, increment affiliate earned, and decrease pending', async () => {
      commissionMock.findFirst.mockResolvedValue({
        id: 'comm-1',
        affiliateId: 'aff-1',
        commissionEgp: 50,
        status: AffiliateCommissionStatus.PENDING,
      });
      commissionMock.update.mockResolvedValue({
        id: 'comm-1',
        status: AffiliateCommissionStatus.CONFIRMED,
      });
      affiliateMock.findUniqueOrThrow.mockResolvedValue({
        id: 'aff-1',
        totalConversions: 10,
        tier: AffiliateTier.STARTER,
      });
      tierConfigMock.findMany.mockResolvedValue([
        { tier: AffiliateTier.STARTER, minConversions: 0 },
      ]);

      const result = await confirmCommission('order-1');
      expect(result).not.toBeNull();

      expect(commissionMock.update).toHaveBeenCalledWith({
        where: { id: 'comm-1' },
        data: { status: AffiliateCommissionStatus.CONFIRMED, confirmedAt: expect.any(Date) },
      });
      expect(affiliateMock.update).toHaveBeenCalledWith({
        where: { id: 'aff-1' },
        data: {
          totalConversions: { increment: 1 },
          totalEarnedEgp: { increment: 50 },
          pendingEarningsEgp: { decrement: 50 },
        },
      });
    });

    it('should cancel a pending commission, decrementing pending only', async () => {
      commissionMock.findFirst.mockResolvedValue({
        id: 'comm-1',
        affiliateId: 'aff-1',
        commissionEgp: 50,
        status: AffiliateCommissionStatus.PENDING,
      });

      await cancelCommission('order-1');

      expect(commissionMock.update).toHaveBeenCalledWith({
        where: { id: 'comm-1' },
        data: { status: AffiliateCommissionStatus.CANCELLED },
      });
      expect(affiliateMock.update).toHaveBeenCalledWith({
        where: { id: 'aff-1' },
        data: {
          pendingEarningsEgp: { decrement: 50 },
        },
      });
    });

    it('should cancel a confirmed commission, decrementing earned earnings and conversions', async () => {
      commissionMock.findFirst.mockResolvedValue({
        id: 'comm-1',
        affiliateId: 'aff-1',
        commissionEgp: 50,
        status: AffiliateCommissionStatus.CONFIRMED,
      });

      await cancelCommission('order-1');

      expect(commissionMock.update).toHaveBeenCalledWith({
        where: { id: 'comm-1' },
        data: { status: AffiliateCommissionStatus.CANCELLED },
      });
      expect(affiliateMock.update).toHaveBeenCalledWith({
        where: { id: 'aff-1' },
        data: {
          totalConversions: { decrement: 1 },
          totalEarnedEgp: { decrement: 50 },
        },
      });
    });
  });

  describe('Referrals & Signup Bonuses', () => {
    it('should not process signup referral if bonuses are disabled', async () => {
      settingsMock.upsert.mockResolvedValue({ bonusesEnabled: false });

      const result = await processReferralSignup('new-aff-1', 'SLUG12');
      expect(result).toBeNull();
    });

    it('should create pending bonuses for referrer and joiner', async () => {
      settingsMock.upsert.mockResolvedValue({
        bonusesEnabled: true,
        referrerBonusEgp: 50,
        joinerBonusEgp: 30,
        bonusExpiryDays: 90,
      });
      affiliateMock.findUnique.mockResolvedValue({ id: 'referrer-1', status: 'ACTIVE' });
      bonusMock.create
        .mockResolvedValueOnce({ id: 'bonus-ref' })
        .mockResolvedValueOnce({ id: 'bonus-join' });
      referralMock.create.mockResolvedValue({ id: 'ref-1' });

      const result = await processReferralSignup('new-aff-1', 'SLUG12');
      expect(result).not.toBeNull();

      expect(bonusMock.create).toHaveBeenCalledWith({
        data: {
          affiliateId: 'referrer-1',
          type: AffiliateBonusType.REFERRER_SIGNUP,
          amountEgp: 50,
          status: AffiliateBonusStatus.PENDING,
          expiresAt: expect.any(Date),
        },
      });
      expect(bonusMock.create).toHaveBeenCalledWith({
        data: {
          affiliateId: 'new-aff-1',
          type: AffiliateBonusType.JOINER_SIGNUP,
          amountEgp: 30,
          status: AffiliateBonusStatus.PENDING,
          expiresAt: expect.any(Date),
        },
      });
      expect(referralMock.create).toHaveBeenCalledWith({
        data: {
          referrerAffiliateId: 'referrer-1',
          newAffiliateId: 'new-aff-1',
        },
      });
      expect(referralMock.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: { referrerBonusId: 'bonus-ref', joinerBonusId: 'bonus-join' },
      });
    });

    it('should activate referral bonuses upon first order', async () => {
      referralMock.findUnique.mockResolvedValue({
        id: 'ref-1',
        firstOrderTriggered: false,
        referrerBonusId: 'bonus-ref',
        joinerBonusId: 'bonus-join',
      });

      const result = await activateReferralBonuses('new-aff-1', 'order-1');
      expect(result).not.toBeNull();

      expect(referralMock.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: { firstOrderTriggered: true, firstOrderId: 'order-1' },
      });
      expect(bonusMock.update).toHaveBeenCalledTimes(2);
      expect(bonusMock.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'bonus-ref' },
        data: { status: AffiliateBonusStatus.ACTIVE, activatedAt: expect.any(Date) },
      });
      expect(bonusMock.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'bonus-join' },
        data: { status: AffiliateBonusStatus.ACTIVE, activatedAt: expect.any(Date) },
      });
    });
  });

  describe('Utility Helpers', () => {
    it('should generate promo code format properly', () => {
      const code = generatePromoCode('Mazen Hegazy', 15);
      expect(code).toBe('MAZEN15');
    });

    it('should check promo code availability correctly', async () => {
      affiliateMock.findUnique.mockResolvedValueOnce({ id: 'aff-1' }).mockResolvedValueOnce(null);

      expect(await isPromoCodeAvailable('TAKEN')).toBe(false);
      expect(await isPromoCodeAvailable('FREE')).toBe(true);
    });
  });
});
