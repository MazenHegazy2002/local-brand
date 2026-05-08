/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from '@jest/globals';
import { sanitizeHtml, cn } from '@/lib/utils';

describe('sanitizeHtml', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips <script> tags', () => {
    const dirty = '<p>safe</p><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert(1)');
    expect(clean).toContain('safe');
  });

  it('strips inline onerror handlers', () => {
    const dirty = '<img src=x onerror=alert(1)>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
  });

  it('strips javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/javascript:/i);
  });

  it('preserves safe formatting tags', () => {
    const dirty = '<p><strong>bold</strong> and <em>italic</em></p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<strong>');
    expect(clean).toContain('<em>');
  });
});

describe('cn', () => {
  it('joins truthy strings with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string when no truthy values', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
