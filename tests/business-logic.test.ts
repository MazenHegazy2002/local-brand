/**
 * @jest-environment node
 *
 * Unit tests for the business-logic helpers in `src/lib/constants.ts`.
 * These functions are pure and have no side effects — perfect for unit testing.
 */

import {
  calculateVAT,
  calculateCommission,
  isReturnEligible,
  isEscrowEligible,
  formatCurrency,
  VAT_RATE,
  DEFAULT_COMMISSION_RATE,
  RETURN_WINDOW_DAYS,
  ESCROW_HOLD_DAYS,
} from '@/lib/constants';

describe('calculateVAT', () => {
  it('applies 14% VAT to a round number', () => {
    // 100 * 0.14 = 14
    expect(calculateVAT(100)).toBe(14);
  });

  it('rounds to 2 decimal places', () => {
    // 33.33 * 0.14 = 4.6662 → 4.67
    expect(calculateVAT(33.33)).toBe(4.67);
  });

  it('returns 0 for a zero subtotal', () => {
    expect(calculateVAT(0)).toBe(0);
  });

  it('is consistent with the exported VAT_RATE constant', () => {
    const subtotal = 250;
    expect(calculateVAT(subtotal)).toBe(Math.round(subtotal * VAT_RATE * 100) / 100);
  });
});

describe('calculateCommission', () => {
  it('applies 15% default commission', () => {
    // 200 * 0.15 = 30
    expect(calculateCommission(200)).toBe(30);
  });

  it('accepts a custom rate', () => {
    // 200 * 0.20 = 40
    expect(calculateCommission(200, 0.2)).toBe(40);
  });

  it('rounds correctly for fractional amounts', () => {
    // 99.99 * 0.15 = 14.9985 → 15
    expect(calculateCommission(99.99)).toBe(15);
  });

  it('returns 0 commission on a zero-value order', () => {
    expect(calculateCommission(0)).toBe(0);
  });

  it('is consistent with DEFAULT_COMMISSION_RATE', () => {
    const gross = 500;
    expect(calculateCommission(gross)).toBe(
      Math.round(gross * DEFAULT_COMMISSION_RATE * 100) / 100
    );
  });
});

describe('isReturnEligible', () => {
  it('returns true when delivered today (0 days ago)', () => {
    expect(isReturnEligible(new Date())).toBe(true);
  });

  it('returns true when delivered 1 day ago', () => {
    const d = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    expect(isReturnEligible(d)).toBe(true);
  });

  it(`returns true when delivered exactly ${RETURN_WINDOW_DAYS} days ago`, () => {
    const d = new Date(Date.now() - RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    expect(isReturnEligible(d)).toBe(true);
  });

  it(`returns false when delivered ${RETURN_WINDOW_DAYS + 1} days ago`, () => {
    const d = new Date(Date.now() - (RETURN_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(isReturnEligible(d)).toBe(false);
  });
});

describe('isEscrowEligible', () => {
  it('returns false when delivered today', () => {
    expect(isEscrowEligible(new Date())).toBe(false);
  });

  it(`returns false when delivered ${ESCROW_HOLD_DAYS - 1} days ago`, () => {
    const d = new Date(Date.now() - (ESCROW_HOLD_DAYS - 1) * 24 * 60 * 60 * 1000);
    expect(isEscrowEligible(d)).toBe(false);
  });

  it(`returns true when delivered exactly ${ESCROW_HOLD_DAYS} days ago`, () => {
    const d = new Date(Date.now() - ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000);
    expect(isEscrowEligible(d)).toBe(true);
  });

  it(`returns true when delivered ${ESCROW_HOLD_DAYS + 5} days ago`, () => {
    const d = new Date(Date.now() - (ESCROW_HOLD_DAYS + 5) * 24 * 60 * 60 * 1000);
    expect(isEscrowEligible(d)).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('formats an EGP amount', () => {
    const formatted = formatCurrency(250);
    // Should contain the number 250 in some form
    expect(formatted).toContain('250');
  });

  it('formats a zero amount', () => {
    const formatted = formatCurrency(0);
    expect(formatted).toContain('0');
  });

  it('accepts a custom currency', () => {
    const formatted = formatCurrency(100, 'USD');
    expect(formatted).toContain('100');
  });
});
