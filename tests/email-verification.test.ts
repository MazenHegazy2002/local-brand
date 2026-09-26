/**
 * @jest-environment node
 *
 * Tests for email verification URL sanitization and domain enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getEmailBaseUrl, generateEmailVerificationEmail } from '@/lib/email-verification';

describe('Email verification domain enforcement', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
  });

  it('defaults to https://brandyy.shop when env is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    expect(getEmailBaseUrl()).toBe('https://brandyy.shop');
  });

  it('rejects localhost and 127.0.0.1 and falls back to https://brandyy.shop', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXTAUTH_URL = 'http://127.0.0.1:3000';
    expect(getEmailBaseUrl()).toBe('https://brandyy.shop');
  });

  it('accepts configured production domains', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://brandyy.shop';
    expect(getEmailBaseUrl()).toBe('https://brandyy.shop');
  });

  it('sanitizes localhost verifyUrl in generateEmailVerificationEmail to brandyy.shop', () => {
    const html = generateEmailVerificationEmail(
      'Test User',
      'http://localhost:3000/api/auth/verify-email?token=abcdef123456'
    );
    expect(html).toContain('https://brandyy.shop/api/auth/verify-email?token=abcdef123456');
    expect(html).not.toContain('localhost');
  });

  it('sanitizes relative verifyUrl in generateEmailVerificationEmail to brandyy.shop', () => {
    const html = generateEmailVerificationEmail(
      'Test User',
      '/api/auth/verify-email?token=abcdef123456'
    );
    expect(html).toContain('https://brandyy.shop/api/auth/verify-email?token=abcdef123456');
  });
});
