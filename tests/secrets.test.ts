/**
 * @jest-environment node
 *
 * Verifies the at-rest secret encryption helpers used to protect seller
 * bank account numbers (and the Payout per-row snapshots). Round-trip
 * correctness, the legacy plain-text fallback, the no-key fallback, and
 * the redaction format are all exercised.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
// `process.env.NODE_ENV` is typed as a read-only literal under @types/node so
// we work around it via a typed proxy when we need to flip it for one test.
const env = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = env.NODE_ENV;
const ORIGINAL_KEY = env.BANK_ACCOUNT_SECRET;

// `loadKey` caches the parsed key in module scope, so we have to reset the
// module between tests that change BANK_ACCOUNT_SECRET.
async function freshSecrets() {
  jest.resetModules();
  return import('@/lib/secrets');
}

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  // Restore env vars so we don't leak setup into other suites.
  if (ORIGINAL_KEY === undefined) delete env.BANK_ACCOUNT_SECRET;
  else env.BANK_ACCOUNT_SECRET = ORIGINAL_KEY;
  if (ORIGINAL_NODE_ENV === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe('secrets — encryptSecret / readSecret round-trip', () => {
  it('round-trips arbitrary UTF-8 strings when a key is configured', async () => {
    process.env.BANK_ACCOUNT_SECRET = KEY_HEX;
    const { encryptSecret, readSecret } = await freshSecrets();

    const samples = [
      'EG12 0000 0000 0000 0001 2345 678',
      'IBAN GB29 NWBK 6016 1331 9268 19',
      'حساب بنكي ١٢٣٤',
      '   spaces preserved   ',
    ];

    for (const plain of samples) {
      const blob = encryptSecret(plain);
      expect(blob).not.toBeNull();
      expect(blob).toMatch(/^enc:v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
      const back = readSecret(blob);
      expect(back).toBe(plain);
    }
  });

  it('produces a different ciphertext each call (random IV)', async () => {
    process.env.BANK_ACCOUNT_SECRET = KEY_HEX;
    const { encryptSecret } = await freshSecrets();

    const a = encryptSecret('same plaintext');
    const b = encryptSecret('same plaintext');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
  });

  it('accepts a base64-encoded key (44 chars representing 32 bytes)', async () => {
    // 32 zero bytes encoded as base64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    process.env.BANK_ACCOUNT_SECRET = Buffer.alloc(32, 0).toString('base64');
    const { encryptSecret, readSecret } = await freshSecrets();

    const blob = encryptSecret('hello');
    expect(blob).not.toBeNull();
    expect(readSecret(blob)).toBe('hello');
  });
});

describe('secrets — readSecret legacy plain-text fallback', () => {
  it('returns the raw value when stored as plain-text (legacy rows)', async () => {
    process.env.BANK_ACCOUNT_SECRET = KEY_HEX;
    const { readSecret } = await freshSecrets();

    expect(readSecret('123456789')).toBe('123456789');
    expect(readSecret('any-old-value')).toBe('any-old-value');
  });

  it('returns null for empty / null / undefined inputs', async () => {
    process.env.BANK_ACCOUNT_SECRET = KEY_HEX;
    const { readSecret } = await freshSecrets();

    expect(readSecret(null)).toBeNull();
    expect(readSecret(undefined)).toBeNull();
    expect(readSecret('')).toBeNull();
  });
});

describe('secrets — encryptSecret without a key', () => {
  it('returns null in development so callers can fall back to plain-text', async () => {
    delete env.BANK_ACCOUNT_SECRET;
    env.NODE_ENV = 'development';
    const { encryptSecret } = await freshSecrets();

    expect(encryptSecret('hello')).toBeNull();
  });

  it('still returns null in production but logs a loud warning', async () => {
    delete env.BANK_ACCOUNT_SECRET;
    env.NODE_ENV = 'production';
    const { encryptSecret } = await freshSecrets();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = encryptSecret('hello');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('BANK_ACCOUNT_SECRET not configured in production')
    );
    consoleSpy.mockRestore();
  });
});

describe('secrets — tryDecrypt failure modes', () => {
  it('returns null for a malformed envelope', async () => {
    process.env.BANK_ACCOUNT_SECRET = KEY_HEX;
    const { tryDecrypt } = await freshSecrets();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(tryDecrypt('enc:v1:not-a-blob')).toBeNull();
    expect(tryDecrypt('enc:v1:abcd:efgh')).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns null when the key is rotated and the auth tag mismatches', async () => {
    process.env.BANK_ACCOUNT_SECRET = KEY_HEX;
    const { encryptSecret } = await freshSecrets();
    const blob = encryptSecret('classified');
    expect(blob).not.toBeNull();

    // Now rotate the key — the same blob shouldn't decrypt anymore.
    process.env.BANK_ACCOUNT_SECRET =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { tryDecrypt: tryAfterRotate } = await freshSecrets();

    expect(tryAfterRotate(blob!)).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe('secrets — redactBankAccount', () => {
  it('keeps the last 4 chars and masks the rest', async () => {
    const { redactBankAccount } = await freshSecrets();
    expect(redactBankAccount('EG12 3456 7890 1234')).toBe('••• 1234');
    expect(redactBankAccount('123456789012')).toBe('••• 9012');
  });

  it('handles short inputs without panicking', async () => {
    const { redactBankAccount } = await freshSecrets();
    expect(redactBankAccount('1234')).toBe('••1234');
    expect(redactBankAccount('12')).toBe('••12');
  });

  it('returns empty string for null / undefined / empty input', async () => {
    const { redactBankAccount } = await freshSecrets();
    expect(redactBankAccount(null)).toBe('');
    expect(redactBankAccount(undefined)).toBe('');
    expect(redactBankAccount('')).toBe('');
  });
});

describe('secrets — isEncrypted sentinel detection', () => {
  it('detects the enc:v1: envelope', async () => {
    const { isEncrypted } = await freshSecrets();
    expect(isEncrypted('enc:v1:aabbcc:ddeeff:112233')).toBe(true);
  });

  it('treats anything else as plain-text', async () => {
    const { isEncrypted } = await freshSecrets();
    expect(isEncrypted('hello')).toBe(false);
    expect(isEncrypted('enc:v0:aabbcc:ddeeff:112233')).toBe(false);
    expect(isEncrypted('')).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });
});
