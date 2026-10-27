import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductDetails from '@/app/product/[id]/ProductDetails';

// Mock LanguageContext
jest.mock('@/providers/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    lang: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  }),
}));

// Mock WishlistButton
jest.mock('@/components/WishlistButton', () => {
  const MockWishlist = () => <div data-testid="wishlist-btn" />;
  MockWishlist.displayName = 'MockWishlist';
  return MockWishlist;
});
jest.mock('@/components/ShareButton', () => {
  const MockShare = () => <div data-testid="share-btn" />;
  MockShare.displayName = 'MockShare';
  return { ShareButton: MockShare };
});
jest.mock('@/components/ReportButton', () => {
  const MockReport = () => <div data-testid="report-btn" />;
  MockReport.displayName = 'MockReport';
  return { ReportButton: MockReport };
});

const mockProduct = {
  id: '371b533b-cb97-4ea7-87c2-190f0b5bd86b',
  title: 'High quality watch',
  slug: 'high-quality-watch-4',
  description: 'Cartier style watch with black, blue, and white dials',
  basePrice: 400,
  seller: { storeName: 'Zento', status: 'ACTIVE' },
  category: { name: 'Men', slug: 'men' },
  images: [
    {
      id: 'img-black',
      productId: '371b533b-cb97-4ea7-87c2-190f0b5bd86b',
      url: 'https://brandyy.shop/files/cartier-black.jpg',
      isPrimary: true,
    },
    {
      id: 'img-blue',
      productId: '371b533b-cb97-4ea7-87c2-190f0b5bd86b',
      url: 'https://brandyy.shop/files/cartier-blue.jpg',
      isPrimary: false,
    },
    {
      id: 'img-white',
      productId: '371b533b-cb97-4ea7-87c2-190f0b5bd86b',
      url: 'https://brandyy.shop/files/cartier-white.jpg',
      isPrimary: false,
    },
  ],
  variants: [
    {
      id: 'var-black',
      sku: 'HIGH-QUALITY-WATCH-4-BLACK-1',
      title: 'Black',
      attributes: JSON.stringify({ color: 'Black' }),
      price: 400,
      stockCount: 1,
    },
    {
      id: 'var-blue',
      sku: 'HIGH-QUALITY-WATCH-4-BLUE-1',
      title: 'Blue',
      attributes: JSON.stringify({ color: 'Blue' }),
      price: 400,
      stockCount: 2,
    },
    {
      id: 'var-white',
      sku: 'HIGH-QUALITY-WATCH-4-WHITE-1',
      title: 'White',
      attributes: JSON.stringify({ color: 'White' }),
      price: 400,
      stockCount: 2,
    },
  ],
  reviews: [],
};

describe('ProductDetails - Gallery and Color Two-Way Sync', () => {
  it('changes active preview image and selected state when clicking color swatches', () => {
    const { container } = render(<ProductDetails product={mockProduct} />);

    // Primary image initially displayed in the main showcase
    const mainImg = container.querySelector('.aspect-square img') as HTMLImageElement;
    expect(mainImg).toBeTruthy();
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-black.jpg');

    // Click "Blue" color button
    const blueBtn = screen.getByRole('button', { name: /blue/i });
    fireEvent.click(blueBtn);

    // Main image switches to blue watch image
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-blue.jpg');

    // Click "White" color button
    const whiteBtn = screen.getByRole('button', { name: /white/i });
    fireEvent.click(whiteBtn);

    // Main image switches to white watch image
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-white.jpg');
  });

  it('changes active preview image and selects corresponding color when clicking thumbnails', () => {
    const { container } = render(<ProductDetails product={mockProduct} />);

    const mainImg = container.querySelector('.aspect-square img') as HTMLImageElement;

    // Get thumbnails
    const thumbnails = screen.getAllByRole('button', {
      name: /gallery thumbnail/i,
    });
    expect(thumbnails.length).toBe(3);

    // Click thumbnail 1 (Blue)
    fireEvent.click(thumbnails[1]);

    // Main image updates to blue image
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-blue.jpg');

    // Active color updates to Blue in the UI
    const blueBtn = screen.getByRole('button', { name: /blue/i });
    expect(blueBtn.className).toContain('border-[#1e3b8a]');

    // Click thumbnail 2 (White)
    fireEvent.click(thumbnails[2]);
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-white.jpg');

    const whiteBtn = screen.getByRole('button', { name: /white/i });
    expect(whiteBtn.className).toContain('border-[#1e3b8a]');

    // Click thumbnail 0 (Black)
    fireEvent.click(thumbnails[0]);
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-black.jpg');

    const blackBtn = screen.getByRole('button', { name: /black/i });
    expect(blackBtn.className).toContain('border-[#1e3b8a]');
  });

  it('persists selected color and image when changing quantity or re-rendering', () => {
    const { container } = render(<ProductDetails product={mockProduct} />);

    const mainImg = container.querySelector('.aspect-square img') as HTMLImageElement;

    // Select Blue
    const blueBtn = screen.getByRole('button', { name: /blue/i });
    fireEvent.click(blueBtn);
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-blue.jpg');

    // Increase quantity (+ button)
    const plusBtn = screen.getByRole('button', { name: '+' });
    fireEvent.click(plusBtn);

    // Image and color must NOT be reset by state change
    expect(mainImg.src).toBe('https://brandyy.shop/files/cartier-blue.jpg');
    expect(blueBtn.className).toContain('border-[#1e3b8a]');
  });
});
