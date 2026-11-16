import { describe, it, expect } from '@jest/globals';
import { calculateVAT, calculateCommission, getShippingRate } from '@/lib/constants';

describe('Business Constants', () => {
  it('calculates VAT correctly', () => {
    // VAT is included in product prices, so nothing is added on top.
    expect(calculateVAT(100)).toBe(0);
    expect(calculateVAT(1000)).toBe(0);
  });

  it('calculates commission correctly', () => {
    expect(calculateCommission(100)).toBe(10);
    expect(calculateCommission(1000)).toBe(100);
  });

  it('gets shipping rate for known governorates', () => {
    // Egypt Post list, shipped from Cairo, first 1 kg
    expect(getShippingRate('cairo')).toBe(79.6);
    expect(getShippingRate('giza')).toBe(79.6);
    expect(getShippingRate('alexandria')).toBe(91);
  });

  it('returns default shipping rate for unknown governorates', () => {
    expect(getShippingRate('unknown')).toBe(79.6);
  });
});

describe('Validation Schemas', () => {
  it('validates email correctly', async () => {
    const { z } = await import('zod');
    const emailSchema = z.string().email();
    expect(emailSchema.safeParse('test@example.com').success).toBe(true);
    expect(emailSchema.safeParse('invalid').success).toBe(false);
  });
});
