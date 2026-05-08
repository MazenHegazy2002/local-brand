/**
 * @jest-environment node
 *
 * Tests verify our PaySky helpers against the published reference vectors in
 * the PayForm Plus Integration Guide (Annex B, sections 5.1, 5.2, 5.3).
 */
import { describe, it, expect } from '@jest/globals';
import {
  buildMerchantReference,
  canonicalize,
  formatPaySkyDate,
  hmacSha256Hex,
  signLightboxRequest,
  toPiasters,
  verifyCallbackHash,
} from '@/lib/paysky';

describe('paysky helpers', () => {
  describe('toPiasters', () => {
    it('converts EGP to integer piasters', () => {
      expect(toPiasters(1)).toBe('100');
      expect(toPiasters(99.5)).toBe('9950');
      expect(toPiasters(100)).toBe('10000');
    });

    it('rounds half-cent values to nearest integer', () => {
      // 99.999 * 100 = 9999.9 → rounds to 10000
      expect(toPiasters(99.999)).toBe('10000');
    });
  });

  describe('formatPaySkyDate', () => {
    it('formats yyyyMMddHHmm', () => {
      const d = new Date(2024, 0, 5, 9, 7); // 2024-01-05 09:07 (local)
      expect(formatPaySkyDate(d)).toBe('202401050907');
    });

    it('zero-pads single digit fields', () => {
      const d = new Date(2020, 8, 17, 14, 18); // 2020-09-17 14:18
      expect(formatPaySkyDate(d)).toBe('202009171418');
    });
  });

  describe('canonicalize', () => {
    it('joins sorted name=value pairs with &', () => {
      const out = canonicalize({
        Amount: '100',
        DateTimeLocalTrxn: '202009171418',
        MerchantId: '43233',
        MerchantReference: 'Txn-1234',
        TerminalId: '53532091',
      });
      // Expected order is alphabetical (case-sensitive)
      expect(out).toBe(
        'Amount=100&DateTimeLocalTrxn=202009171418&MerchantId=43233&MerchantReference=Txn-1234&TerminalId=53532091'
      );
    });

    it('sorts numeric and string values consistently', () => {
      const out = canonicalize({ B: 'b', A: 'a', C: 1 });
      expect(out).toBe('A=a&B=b&C=1');
    });
  });

  describe('signLightboxRequest — Annex B 5.1', () => {
    it('matches the published reference vector', () => {
      // Published example from the guide:
      //   secret = 35333335653063302D663464372D343237652D623739362D643234666661386432323065
      //   payload = Amount=100&DateTimeLocalTrxn=202009171418&MerchantId=43233&MerchantReference=Txn-1234&TerminalId=53532091
      //   expected = EAD7AB68E23BFF2E5B03F4A0CD41581722FD14C349C6743CD91B577341465A61
      const secret =
        '35333335653063302D663464372D343237652D623739362D643234666661386432323065';
      const hash = signLightboxRequest(secret, {
        Amount: '100',
        DateTimeLocalTrxn: '202009171418',
        MerchantId: '43233',
        MerchantReference: 'Txn-1234',
        TerminalId: '53532091',
      });
      expect(hash).toBe('EAD7AB68E23BFF2E5B03F4A0CD41581722FD14C349C6743CD91B577341465A61');
    });
  });

  describe('verifyCallbackHash — Annex B 5.2', () => {
    it('accepts a valid PaySky callback hash', () => {
      // Reference vector from the guide:
      //   secret = 62656164643366382D626466612D343461392D383630332D346135613363376666356264
      //   payload = Amount=55&Currency=818&MerchantId=14554075972&MerchantReference=1234&PaidThrough=Card&TerminalId=93171742&TxnDate=20190826111304
      //   expected = AFE674E81B1933DAFBCB5BB4A7A78C5F644AF104CA340AEBD5379FEE86FF1EEE
      const secret =
        '62656164643366382D626466612D343461392D383630332D346135613363376666356264';
      const callback = {
        Amount: '55',
        Currency: '818',
        MerchantId: '14554075972',
        MerchantReference: '1234',
        PaidThrough: 'Card',
        TerminalId: '93171742',
        TxnDate: '20190826111304',
        SecureHash: 'AFE674E81B1933DAFBCB5BB4A7A78C5F644AF104CA340AEBD5379FEE86FF1EEE',
      };
      expect(verifyCallbackHash(secret, callback)).toBe(true);
    });

    it('rejects a tampered callback', () => {
      const secret =
        '62656164643366382D626466612D343461392D383630332D346135613363376666356264';
      const callback = {
        Amount: '55',
        Currency: '818',
        MerchantId: '14554075972',
        MerchantReference: '1234',
        PaidThrough: 'Card',
        TerminalId: '93171742',
        TxnDate: '20190826111304',
        SecureHash: '0000000000000000000000000000000000000000000000000000000000000000',
      };
      expect(verifyCallbackHash(secret, callback)).toBe(false);
    });

    it('rejects when amount has been tampered', () => {
      const secret =
        '62656164643366382D626466612D343461392D383630332D346135613363376666356264';
      const callback = {
        Amount: '5500', // tampered upward
        Currency: '818',
        MerchantId: '14554075972',
        MerchantReference: '1234',
        PaidThrough: 'Card',
        TerminalId: '93171742',
        TxnDate: '20190826111304',
        SecureHash: 'AFE674E81B1933DAFBCB5BB4A7A78C5F644AF104CA340AEBD5379FEE86FF1EEE',
      };
      expect(verifyCallbackHash(secret, callback)).toBe(false);
    });

    it('rejects when SecureHash is missing or empty', () => {
      const secret =
        '62656164643366382D626466612D343461392D383630332D346135613363376666356264';
      expect(
        verifyCallbackHash(secret, {
          Amount: '55',
          MerchantId: '14554075972',
          SecureHash: '',
        })
      ).toBe(false);
    });
  });

  describe('hmacSha256Hex', () => {
    it('returns uppercase hex', () => {
      const out = hmacSha256Hex('00', 'hello');
      expect(out).toMatch(/^[0-9A-F]{64}$/);
    });
  });

  describe('buildMerchantReference', () => {
    it('produces a unique reference under 50 chars', () => {
      const a = buildMerchantReference('user-abc-123');
      const b = buildMerchantReference('user-abc-123');
      expect(a).not.toBe(b);
      expect(a.length).toBeLessThanOrEqual(50);
      expect(b.length).toBeLessThanOrEqual(50);
    });

    it('strips non-alphanumeric chars from prefix', () => {
      const ref = buildMerchantReference('a@b#c$d!');
      expect(ref).toMatch(/^abcd-/i);
    });
  });
});
