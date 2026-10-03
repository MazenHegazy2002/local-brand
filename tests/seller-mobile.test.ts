import { describe, it, expect } from '@jest/globals';
import {
  deriveSellerOrderStatus,
  statusInTab,
  signLabel,
  verifyLabel,
  paymentLabel,
} from '@/lib/seller-mobile';

describe('deriveSellerOrderStatus', () => {
  it('maps order + item statuses to seller tabs', () => {
    expect(deriveSellerOrderStatus('CONFIRMED', ['PENDING'])).toBe('new');
    expect(deriveSellerOrderStatus('CONFIRMED', ['CONFIRMED', 'PENDING'])).toBe('new');
    expect(deriveSellerOrderStatus('CONFIRMED', ['CONFIRMED'])).toBe('accepted');
    expect(deriveSellerOrderStatus('PROCESSING', ['CONFIRMED', 'CANCELLED'])).toBe('accepted');
    expect(deriveSellerOrderStatus('SHIPPED', ['SHIPPED'])).toBe('shipped');
    expect(deriveSellerOrderStatus('DELIVERED', ['DELIVERED'])).toBe('delivered');
    expect(deriveSellerOrderStatus('CANCELLED', ['PENDING'])).toBe('cancelled');
    expect(deriveSellerOrderStatus('RETURNED', ['RETURNED'])).toBe('returned');
    expect(deriveSellerOrderStatus('CONFIRMED', ['CANCELLED'])).toBe('cancelled');
  });

  it('puts accepted orders in to_ship and everything in all', () => {
    expect(statusInTab('accepted', 'to_ship')).toBe(true);
    expect(statusInTab('new', 'to_ship')).toBe(false);
    expect(statusInTab('cancelled', 'all')).toBe(true);
    expect(statusInTab('shipped', 'shipped')).toBe(true);
  });

  it('labels payment methods', () => {
    expect(paymentLabel('CASH_ON_DELIVERY')).toBe('COD');
    expect(paymentLabel('PAYSKY')).toBe('PaySky');
  });
});

describe('label signing', () => {
  const secret = 'test-secret';
  const now = 1_700_000_000;
  const exp = now + 600;
  const sig = signLabel('order-1', 'seller-1', exp, secret);

  it('verifies a fresh signature', () => {
    expect(verifyLabel('order-1', 'seller-1', exp, sig, secret, now)).toBe(true);
  });
  it('rejects expired links', () => {
    expect(verifyLabel('order-1', 'seller-1', exp, sig, secret, exp + 1)).toBe(false);
  });
  it('rejects tampering', () => {
    expect(verifyLabel('order-2', 'seller-1', exp, sig, secret, now)).toBe(false);
    expect(verifyLabel('order-1', 'seller-2', exp, sig, secret, now)).toBe(false);
    expect(verifyLabel('order-1', 'seller-1', exp + 60, sig, secret, now)).toBe(false);
    expect(
      verifyLabel(
        'order-1',
        'seller-1',
        exp,
        sig.replace(/.$/, c => (c === '0' ? '1' : '0')),
        secret,
        now
      )
    ).toBe(false);
    expect(verifyLabel('order-1', 'seller-1', exp, 'abc', secret, now)).toBe(false);
    expect(verifyLabel('order-1', 'seller-1', exp, sig, 'other', now)).toBe(false);
  });
});
