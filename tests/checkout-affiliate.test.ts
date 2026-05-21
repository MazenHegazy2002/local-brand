// tests/checkout-affiliate.test.ts
import { prisma } from '@/lib/prisma';
import { applyPromoToCheckout, recordAffiliateSale } from '@/lib/checkout-affiliate';
import * as affiliateLib from '@/lib/affiliate';

// Mock affiliate methods
jest.mock('@/lib/affiliate', () => {
  const actual = jest.requireActual('@/lib/affiliate');
  return {
    ...actual,
    validatePromoCode: jest.fn(),
    createPendingCommission: jest.fn(),
    activateReferralBonuses: jest.fn(),
  };
});

const validatePromoCodeMock = affiliateLib.validatePromoCode as jest.Mock;
const createPendingCommissionMock = affiliateLib.createPendingCommission as jest.Mock;
const activateReferralBonusesMock = affiliateLib.activateReferralBonuses as jest.Mock;

const promoUsageMock = prisma.promoCodeUsage as any;
const affiliateMock = prisma.affiliate as any;

describe('Checkout Affiliate Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyPromoToCheckout', () => {
    it('should return unchanged total when promoCode is null', async () => {
      const result = await applyPromoToCheckout({
        promoCode: null,
        orderTotalEgp: 500,
        buyerId: 'buyer-1',
      });

      expect(result).toEqual({
        finalTotalEgp: 500,
        discountAmountEgp: 0,
        affiliateId: null,
        discountPct: 0,
      });
      expect(validatePromoCodeMock).not.toHaveBeenCalled();
    });

    it('should return unchanged total when promoCode is invalid', async () => {
      validatePromoCodeMock.mockResolvedValue({ valid: false, reason: 'Invalid code' });

      const result = await applyPromoToCheckout({
        promoCode: 'INVALIDCODE',
        orderTotalEgp: 500,
        buyerId: 'buyer-1',
      });

      expect(result).toEqual({
        finalTotalEgp: 500,
        discountAmountEgp: 0,
        affiliateId: null,
        discountPct: 0,
      });
      expect(validatePromoCodeMock).toHaveBeenCalledWith('INVALIDCODE', 500, 'buyer-1');
    });

    it('should apply discount when promoCode is valid', async () => {
      validatePromoCodeMock.mockResolvedValue({
        valid: true,
        affiliateId: 'aff-123',
        discountPct: 10,
        discountAmountEgp: 50,
      });

      const result = await applyPromoToCheckout({
        promoCode: 'VALID10',
        orderTotalEgp: 500,
        buyerId: 'buyer-1',
      });

      expect(result).toEqual({
        finalTotalEgp: 450,
        discountAmountEgp: 50,
        affiliateId: 'aff-123',
        discountPct: 10,
      });
    });
  });

  describe('recordAffiliateSale', () => {
    it('should create promo usage, create pending commission, and increment affiliate pending earnings', async () => {
      const mockCommission = { id: 'comm-1', commissionEgp: 25 };
      createPendingCommissionMock.mockResolvedValue(mockCommission);
      promoUsageMock.create.mockResolvedValue({ id: 'usage-1' });
      affiliateMock.findUnique.mockResolvedValue(null); // Buyer is not an affiliate

      await recordAffiliateSale({
        orderId: 'order-1',
        affiliateId: 'aff-123',
        buyerId: 'buyer-1',
        orderTotalBeforeDiscountEgp: 500,
        orderTotalAfterDiscountEgp: 450,
        discountPct: 10,
        discountAmountEgp: 50,
      });

      expect(promoUsageMock.create).toHaveBeenCalledWith({
        data: {
          affiliateId: 'aff-123',
          orderId: 'order-1',
          buyerId: 'buyer-1',
          discountPct: 10,
          discountAmountEgp: 50,
          orderTotalBeforeDiscount: 500,
          orderTotalAfterDiscount: 450,
        },
      });

      expect(createPendingCommissionMock).toHaveBeenCalledWith('order-1', 'aff-123', 450);

      expect(affiliateMock.update).toHaveBeenCalledWith({
        where: { id: 'aff-123' },
        data: { pendingEarningsEgp: { increment: 25 } },
      });

      expect(activateReferralBonusesMock).not.toHaveBeenCalled();
    });

    it('should trigger activateReferralBonuses if buyer is also an affiliate', async () => {
      const mockCommission = { id: 'comm-1', commissionEgp: 25 };
      createPendingCommissionMock.mockResolvedValue(mockCommission);
      promoUsageMock.create.mockResolvedValue({ id: 'usage-1' });
      affiliateMock.findUnique.mockResolvedValue({ id: 'buyer-aff-id' });

      await recordAffiliateSale({
        orderId: 'order-1',
        affiliateId: 'aff-123',
        buyerId: 'buyer-1',
        orderTotalBeforeDiscountEgp: 500,
        orderTotalAfterDiscountEgp: 450,
        discountPct: 10,
        discountAmountEgp: 50,
      });

      expect(activateReferralBonusesMock).toHaveBeenCalledWith('buyer-aff-id', 'order-1');
    });
  });
});
