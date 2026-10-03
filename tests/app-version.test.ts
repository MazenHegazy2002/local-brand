import { describe, it, expect } from '@jest/globals';
import { compareVersions, resolveAppStatus } from '@/lib/app-version';

describe('compareVersions', () => {
  it('compares numerically, not lexically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });
  it('treats missing parts as 0', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.1', '1.2')).toBe(1);
  });
  it('treats non-numeric parts as 0', () => {
    expect(compareVersions('1.x.3', '1.0.3')).toBe(0);
    expect(compareVersions('garbage', '0.0.0')).toBe(0);
  });
});

describe('resolveAppStatus', () => {
  const base = { latest: '1.5.0', min: '1.2.0', killSwitch: false, maintenance: false };
  it('ok when at or above latest', () => {
    expect(resolveAppStatus({ ...base, version: '1.5.0' })).toBe('ok');
    expect(resolveAppStatus({ ...base, version: '1.6' })).toBe('ok');
  });
  it('update_available between min and latest', () => {
    expect(resolveAppStatus({ ...base, version: '1.2.0' })).toBe('update_available');
  });
  it('update_required below min', () => {
    expect(resolveAppStatus({ ...base, version: '1.1.9' })).toBe('update_required');
    expect(resolveAppStatus({ ...base, version: '0.0.0' })).toBe('update_required');
  });
  it('stopped on kill switch or maintenance, regardless of version', () => {
    expect(resolveAppStatus({ ...base, version: '9.9.9', killSwitch: true })).toBe('stopped');
    expect(resolveAppStatus({ ...base, version: '0.0.1', maintenance: true })).toBe('stopped');
  });
});
