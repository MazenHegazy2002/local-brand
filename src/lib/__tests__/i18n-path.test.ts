import { stripLangPrefix } from '../i18n/path';

test('strips the /ar and /fk prefixes', () => {
  expect(stripLangPrefix('/ar/seller-hub')).toBe('/seller-hub');
  expect(stripLangPrefix('/ar/seller-hub/settings')).toBe('/seller-hub/settings');
  expect(stripLangPrefix('/fk/admin-os')).toBe('/admin-os');
  expect(stripLangPrefix('/ar')).toBe('/');
});

test('leaves other paths alone', () => {
  expect(stripLangPrefix('/seller-hub')).toBe('/seller-hub');
  expect(stripLangPrefix('/archive')).toBe('/archive');
  expect(stripLangPrefix('/')).toBe('/');
  expect(stripLangPrefix(null)).toBe('');
});
