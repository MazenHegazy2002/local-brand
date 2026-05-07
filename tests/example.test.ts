import { describe, it, expect } from '@jest/globals';
import { calculateVAT, calculateCommission, getShippingRate } from '@/lib/constants';

describe('Business Constants', () => {
  it('calculates VAT correctly', () => {
    expect(calculateVAT(100)).toBe(14);
    expect(calculateVAT(1000)).toBe(140);
    expect(calculateVAT(50)).toBe(7);
  });

  it('calculates commission correctly', () => {
    expect(calculateCommission(100)).toBe(15);
    expect(calculateCommission(1000)).toBe(150);
  });

  it('gets shipping rate for known governorates', () => {
    expect(getShippingRate('cairo')).toBe(40);
    expect(getShippingRate('giza')).toBe(40);
    expect(getShippingRate('alexandria')).toBe(55);
  });

  it('returns default shipping rate for unknown governorates', () => {
    expect(getShippingRate('unknown')).toBe(75);
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