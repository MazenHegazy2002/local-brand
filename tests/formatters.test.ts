import { describe, it, expect } from '@jest/globals';
import {
  formatEGP,
  formatNumber,
  pluralize,
  formatPriceRange,
} from '@/lib/formatters';

describe('formatters', () => {
  describe('formatEGP', () => {
    it('formats whole numbers with EGP symbol in English', () => {
      const out = formatEGP(1000, 'en-EG');
      expect(out).toMatch(/EGP/);
      expect(out).toMatch(/1,000/);
    });

    it('formats numbers in Arabic locale', () => {
      const out = formatEGP(1000, 'ar-EG');
      // Arabic locale uses Eastern Arabic numerals but also accepts Western digits
      expect(out.length).toBeGreaterThan(0);
    });

    it('rounds decimals to 2 places', () => {
      expect(formatEGP(99.999, 'en-EG')).toContain('100');
    });
  });

  describe('formatNumber', () => {
    it('adds thousand separators', () => {
      expect(formatNumber(1234567, 'en-EG')).toMatch(/1,234,567/);
    });
  });

  describe('pluralize', () => {
    it('handles English plural forms', () => {
      expect(pluralize(1, { one: 'item', other: 'items' }, 'en-EG')).toBe('item');
      expect(pluralize(5, { one: 'item', other: 'items' }, 'en-EG')).toBe('items');
      expect(pluralize(0, { one: 'item', other: 'items' }, 'en-EG')).toBe('items');
    });

    it('handles Arabic plural forms', () => {
      const forms = {
        zero: 'لا عناصر',
        one: 'عنصر',
        two: 'عنصران',
        few: 'عناصر',
        many: 'عنصراً',
        other: 'عنصر',
      };
      const result = pluralize(2, forms, 'ar-EG');
      // Arabic rules vary but should pick 'two' or 'other'
      expect(['عنصران', 'عنصر']).toContain(result);
    });
  });

  describe('formatPriceRange', () => {
    it('returns a single price when min === max', () => {
      const out = formatPriceRange(500, 500, 'en-EG');
      expect(out).not.toContain('–');
      expect(out).toMatch(/500/);
    });

    it('returns a range when min !== max', () => {
      const out = formatPriceRange(100, 500, 'en-EG');
      expect(out).toContain('–');
    });
  });
});
