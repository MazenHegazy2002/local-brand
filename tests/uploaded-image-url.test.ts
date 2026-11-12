import { isUploadedImageUrl } from '@/lib/validation';

describe('isUploadedImageUrl', () => {
  it('accepts server-stored, hosted and data image addresses', () => {
    expect(isUploadedImageUrl('/api/files/37e19286-5c43-4501-b3bd-15606.webp')).toBe(true);
    expect(isUploadedImageUrl('https://res.cloudinary.com/x/image/upload/a.jpg')).toBe(true);
    expect(isUploadedImageUrl('data:image/png;base64,AAAA')).toBe(true);
  });
  it('rejects scripts and other paths', () => {
    expect(isUploadedImageUrl('javascript:alert(1)')).toBe(false);
    expect(isUploadedImageUrl('/api/files/../secret')).toBe(false);
    expect(isUploadedImageUrl('/etc/passwd')).toBe(false);
  });
});
