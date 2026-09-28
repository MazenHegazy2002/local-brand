import { productImageUrl } from '../image-url';

const req = (headers: Record<string, string>) =>
  new Request('http://0.0.0.0:3000/api/x', { headers });

test('data: images point at the public host, not the internal bind address', () => {
  expect(
    productImageUrl(req({ host: 'brandyy.shop', 'x-forwarded-proto': 'https' }), {
      id: 'a',
      url: 'data:image/png;base64,xx',
    })
  ).toBe('https://brandyy.shop/api/images/product-image/a');
});

test('hosted images pass through unchanged', () => {
  expect(productImageUrl(req({}), { id: 'a', url: 'https://cdn/x.png' })).toBe('https://cdn/x.png');
});
