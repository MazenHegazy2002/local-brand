/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/admin-registration-alerts', () => ({ notifyAdminEvent: jest.fn() }));
import { sniffImageType } from '@/lib/website-import-run';

describe('sniffImageType', () => {
  it('recognises formats by their first bytes', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      'image/jpeg'
    );
    expect(
      sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))
    ).toBe('image/png');
    expect(sniffImageType(Buffer.from('RIFF0000WEBPVP8 '))).toBe('image/webp');
    expect(sniffImageType(Buffer.from('GIF89a000000'))).toBe('image/gif');
    expect(sniffImageType(Buffer.from('<html>nope</html>'))).toBeNull();
  });
});
