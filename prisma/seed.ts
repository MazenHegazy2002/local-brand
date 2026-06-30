import { PrismaClient, AffiliateTier } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Demo seed:
 * - Creates 20 standard product categories.
 * - Creates 3 starter accounts (admin / seller / buyer).
 * - Creates 5 sample products per major category with color/size variants
 *   and realistic EGP prices so the marketplace looks populated on first boot.
 */

// ── Catalog data ─────────────────────────────────────────────────────────────

interface SeedVariant {
  label: string; // e.g. "Red - M"
  color?: string;
  size?: string;
  price: number;
  stock: number;
}

interface SeedProduct {
  title: string;
  slug: string;
  description: string;
  basePrice: number;
  img: string;
  isFeatured: boolean;
  variants: SeedVariant[];
}

interface SeedCategory {
  slug: string;
  products: SeedProduct[];
}

const CATALOG: SeedCategory[] = [
  {
    slug: 'women',
    products: [
      {
        title: 'Floral Linen Midi Dress',
        slug: 'floral-linen-midi-dress',
        description:
          'Lightweight 100% linen midi dress with a bold floral print. Perfect for warm Egyptian summers.',
        basePrice: 799,
        img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Blue - S', color: 'Blue', size: 'S', price: 799, stock: 8 },
          { label: 'Pink - M', color: 'Pink', size: 'M', price: 799, stock: 12 },
          { label: 'White - L', color: 'White', size: 'L', price: 799, stock: 5 },
        ],
      },
      {
        title: 'Classic Linen Blouse',
        slug: 'classic-linen-blouse',
        description: 'Relaxed-fit linen blouse with a subtle collar. Pairs with anything.',
        basePrice: 449,
        img: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'White - XS', color: 'White', size: 'XS', price: 449, stock: 10 },
          { label: 'Beige - S', color: 'Beige', size: 'S', price: 449, stock: 9 },
          { label: 'Sage Green - M', color: 'Sage Green', size: 'M', price: 449, stock: 6 },
          { label: 'Black - L', color: 'Black', size: 'L', price: 449, stock: 4 },
        ],
      },
      {
        title: 'Wide-Leg Trousers',
        slug: 'wide-leg-trousers',
        description:
          'Flowing wide-leg trousers in premium cotton blend. Elegant silhouette for every occasion.',
        basePrice: 599,
        img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Camel - XS', color: 'Camel', size: 'XS', price: 599, stock: 7 },
          { label: 'Black - S', color: 'Black', size: 'S', price: 599, stock: 11 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 599, stock: 8 },
        ],
      },
      {
        title: 'Wrap Maxi Dress',
        slug: 'wrap-maxi-dress',
        description: 'Elegant wrap maxi dress in soft crepe fabric. Flattering for all body types.',
        basePrice: 1099,
        img: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Emerald - S', color: 'Emerald', size: 'S', price: 1099, stock: 5 },
          { label: 'Burgundy - M', color: 'Burgundy', size: 'M', price: 1099, stock: 7 },
          { label: 'Dusty Rose - L', color: 'Dusty Rose', size: 'L', price: 1099, stock: 3 },
        ],
      },
      {
        title: 'Cropped Ribbed Top',
        slug: 'cropped-ribbed-top',
        description: 'Soft ribbed-knit cropped top. A wardrobe essential for casual everyday wear.',
        basePrice: 299,
        img: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'White - XS', color: 'White', size: 'XS', price: 299, stock: 15 },
          { label: 'Black - S', color: 'Black', size: 'S', price: 299, stock: 14 },
          { label: 'Blush - M', color: 'Blush', size: 'M', price: 299, stock: 10 },
          { label: 'Gray - L', color: 'Gray', size: 'L', price: 299, stock: 8 },
        ],
      },
    ],
  },
  {
    slug: 'men',
    products: [
      {
        title: 'Oxford Button-Down Shirt',
        slug: 'oxford-button-down-shirt',
        description: 'Classic Egyptian cotton Oxford shirt. Versatile enough for work or weekend.',
        basePrice: 549,
        img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'White - S', color: 'White', size: 'S', price: 549, stock: 12 },
          { label: 'Light Blue - M', color: 'Light Blue', size: 'M', price: 549, stock: 14 },
          { label: 'Charcoal - L', color: 'Charcoal', size: 'L', price: 549, stock: 9 },
          { label: 'White - XL', color: 'White', size: 'XL', price: 549, stock: 6 },
        ],
      },
      {
        title: 'Slim Chinos',
        slug: 'slim-chinos',
        description: 'Modern slim-fit chinos in stretch cotton. Comfortable all day, every day.',
        basePrice: 699,
        img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Beige - 30', color: 'Beige', size: '30', price: 699, stock: 8 },
          { label: 'Navy - 32', color: 'Navy', size: '32', price: 699, stock: 11 },
          { label: 'Olive - 34', color: 'Olive', size: '34', price: 699, stock: 7 },
          { label: 'Black - 36', color: 'Black', size: '36', price: 699, stock: 5 },
        ],
      },
      {
        title: 'Linen Summer Shirt',
        slug: 'linen-summer-shirt',
        description: '100% linen short-sleeve shirt. The essential Egyptian summer staple.',
        basePrice: 499,
        img: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Off-White - S', color: 'Off-White', size: 'S', price: 499, stock: 10 },
          { label: 'Sky Blue - M', color: 'Sky Blue', size: 'M', price: 499, stock: 12 },
          { label: 'Mint - L', color: 'Mint', size: 'L', price: 499, stock: 8 },
        ],
      },
      {
        title: 'Classic Polo Shirt',
        slug: 'classic-polo-shirt',
        description:
          'Piqué polo shirt with a clean, structured collar. Egyptian cotton for superior softness.',
        basePrice: 449,
        img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Navy - S', color: 'Navy', size: 'S', price: 449, stock: 8 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 449, stock: 10 },
          { label: 'Navy - L', color: 'Navy', size: 'L', price: 449, stock: 6 },
          { label: 'Navy - XL', color: 'Navy', size: 'XL', price: 449, stock: 8 },
          { label: 'White - S', color: 'White', size: 'S', price: 449, stock: 7 },
          { label: 'White - M', color: 'White', size: 'M', price: 449, stock: 13 },
          { label: 'White - L', color: 'White', size: 'L', price: 449, stock: 9 },
          { label: 'White - XL', color: 'White', size: 'XL', price: 449, stock: 5 },
          { label: 'Red - S', color: 'Red', size: 'S', price: 449, stock: 6 },
          { label: 'Red - M', color: 'Red', size: 'M', price: 449, stock: 8 },
          { label: 'Red - L', color: 'Red', size: 'L', price: 449, stock: 6 },
          { label: 'Red - XL', color: 'Red', size: 'XL', price: 449, stock: 7 },
          { label: 'Forest Green - S', color: 'Forest Green', size: 'S', price: 449, stock: 5 },
          { label: 'Forest Green - M', color: 'Forest Green', size: 'M', price: 449, stock: 9 },
          { label: 'Forest Green - L', color: 'Forest Green', size: 'L', price: 449, stock: 6 },
          { label: 'Forest Green - XL', color: 'Forest Green', size: 'XL', price: 449, stock: 4 },
        ],
      },
      {
        title: 'Cargo Jogger Pants',
        slug: 'cargo-jogger-pants',
        description:
          'Urban cargo joggers with multiple pockets. Comfortable streetwear for everyday use.',
        basePrice: 599,
        img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Khaki - S', color: 'Khaki', size: 'S', price: 599, stock: 8 },
          { label: 'Black - M', color: 'Black', size: 'M', price: 599, stock: 14 },
          { label: 'Olive - L', color: 'Olive', size: 'L', price: 599, stock: 7 },
        ],
      },
    ],
  },
  {
    slug: 'electronics',
    products: [
      {
        title: 'Wireless Noise-Cancelling Headphones',
        slug: 'wireless-noise-cancelling-headphones',
        description:
          '40-hour battery, active noise cancellation, foldable design. Crystal-clear audio for music and calls.',
        basePrice: 1799,
        img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Midnight Black', color: 'Midnight Black', price: 1799, stock: 15 },
          { label: 'Pearl White', color: 'Pearl White', price: 1799, stock: 10 },
          { label: 'Deep Blue', color: 'Deep Blue', price: 1849, stock: 7 },
        ],
      },
      {
        title: 'USB-C 65W GaN Charger',
        slug: 'usb-c-65w-gan-charger',
        description:
          'Ultra-compact 65W GaN charger with dual USB-C ports. Charges laptops, phones, and tablets.',
        basePrice: 399,
        img: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 399, stock: 20 },
          { label: 'Black', color: 'Black', price: 399, stock: 18 },
        ],
      },
      {
        title: 'Portable Bluetooth Speaker',
        slug: 'portable-bluetooth-speaker',
        description:
          'IPX7 waterproof, 360° sound, 24-hour playtime. The perfect companion for outdoor adventures.',
        basePrice: 1099,
        img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Jet Black', color: 'Jet Black', price: 1099, stock: 12 },
          { label: 'Coral Red', color: 'Coral Red', price: 1099, stock: 9 },
          { label: 'Forest Green', color: 'Forest Green', price: 1149, stock: 6 },
        ],
      },
      {
        title: 'Smart Watch Pro',
        slug: 'smart-watch-pro',
        description:
          'Health tracking, GPS, 7-day battery, AMOLED display. Stay connected and healthy.',
        basePrice: 2499,
        img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Obsidian Black', color: 'Obsidian Black', price: 2499, stock: 10 },
          { label: 'Silver', color: 'Silver', price: 2599, stock: 8 },
          { label: 'Rose Gold', color: 'Rose Gold', price: 2699, stock: 5 },
        ],
      },
      {
        title: 'True Wireless Earbuds',
        slug: 'true-wireless-earbuds',
        description: 'Active noise cancellation, 6+24h battery with case, IPX5 water resistance.',
        basePrice: 1299,
        img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 1299, stock: 14 },
          { label: 'Black', color: 'Black', price: 1299, stock: 16 },
          { label: 'Navy Blue', color: 'Navy Blue', price: 1349, stock: 8 },
        ],
      },
    ],
  },
  {
    slug: 'home',
    products: [
      {
        title: 'Luxury Throw Pillow Set (2 pcs)',
        slug: 'luxury-throw-pillow-set',
        description:
          'Handcrafted decorative throw pillows in premium velvet. Elevate any living space.',
        basePrice: 449,
        img: 'https://images.unsplash.com/photo-1616046386594-c152babc9e15?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Dusty Blue', color: 'Dusty Blue', price: 449, stock: 10 },
          { label: 'Terracotta', color: 'Terracotta', price: 449, stock: 8 },
          { label: 'Forest Green', color: 'Forest Green', price: 449, stock: 7 },
          { label: 'Warm Gray', color: 'Warm Gray', price: 449, stock: 9 },
        ],
      },
      {
        title: 'Soy Wax Scented Candle Set',
        slug: 'soy-wax-scented-candle-set',
        description:
          'Set of 3 hand-poured soy wax candles with cotton wicks. 40-hour burn time each.',
        basePrice: 399,
        img: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Lavender & Vanilla', color: 'Lavender', price: 399, stock: 12 },
          { label: 'Oud & Rose', color: 'Rose', price: 399, stock: 10 },
          { label: 'Jasmine & Musk', color: 'Jasmine', price: 399, stock: 9 },
        ],
      },
      {
        title: 'Bamboo Storage Basket Set',
        slug: 'bamboo-storage-basket-set',
        description:
          'Set of 3 handwoven bamboo baskets in nesting sizes. Eco-friendly home organization.',
        basePrice: 499,
        img: 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Natural', color: 'Natural', price: 499, stock: 8 },
          { label: 'Espresso Brown', color: 'Espresso', price: 549, stock: 6 },
        ],
      },
      {
        title: 'Handmade Ceramic Vase',
        slug: 'handmade-ceramic-vase',
        description:
          'Artisan-crafted ceramic vase with reactive glaze finish. Each piece is unique.',
        basePrice: 649,
        img: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Ivory White', color: 'Ivory', price: 649, stock: 7 },
          { label: 'Sage Green', color: 'Sage', price: 649, stock: 6 },
          { label: 'Midnight Blue', color: 'Midnight Blue', price: 699, stock: 5 },
        ],
      },
      {
        title: 'Acacia Wood Serving Board',
        slug: 'acacia-wood-serving-board',
        description:
          'Premium acacia wood cheese and serving board with juice groove. Food-safe oil finish.',
        basePrice: 549,
        img: 'https://images.unsplash.com/photo-1591378603223-e15b45a81640?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Small (30cm)', size: 'Small', price: 549, stock: 10 },
          { label: 'Large (45cm)', size: 'Large', price: 749, stock: 7 },
        ],
      },
    ],
  },
  {
    slug: 'beauty',
    products: [
      {
        title: 'Vitamin C Brightening Serum',
        slug: 'vitamin-c-brightening-serum',
        description: '20% Vitamin C with hyaluronic acid. Visibly reduces dark spots in 4 weeks.',
        basePrice: 599,
        img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: '30ml', size: '30ml', price: 599, stock: 15 },
          { label: '50ml', size: '50ml', price: 899, stock: 10 },
        ],
      },
      {
        title: 'Egyptian Rose Water Toner',
        slug: 'egyptian-rose-water-toner',
        description:
          'Pure distilled rose water from Egyptian valleys. Hydrates, tones, and refreshes skin.',
        basePrice: 299,
        img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: '200ml', size: '200ml', price: 299, stock: 18 },
          { label: '400ml', size: '400ml', price: 499, stock: 12 },
        ],
      },
      {
        title: 'Argan Oil Hair Mask',
        slug: 'argan-oil-hair-mask',
        description:
          'Deep-conditioning hair mask with Moroccan argan oil. Repairs damage, adds shine.',
        basePrice: 449,
        img: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: '250ml', size: '250ml', price: 449, stock: 12 },
          { label: '500ml', size: '500ml', price: 699, stock: 8 },
        ],
      },
      {
        title: 'Natural Lip Balm Set',
        slug: 'natural-lip-balm-set',
        description: 'Set of 3 natural lip balms with SPF 15. Shea butter and beeswax formula.',
        basePrice: 249,
        img: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Cherry', color: 'Cherry', price: 249, stock: 20 },
          { label: 'Mint', color: 'Mint', price: 249, stock: 18 },
          { label: 'Honey', color: 'Honey', price: 249, stock: 15 },
        ],
      },
      {
        title: 'Kaolin Clay Face Mask',
        slug: 'kaolin-clay-face-mask',
        description:
          'Deep-cleansing kaolin clay mask. Unclogs pores, controls oil, and brightens complexion.',
        basePrice: 349,
        img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: '100g', size: '100g', price: 349, stock: 14 },
          { label: '250g', size: '250g', price: 599, stock: 9 },
        ],
      },
    ],
  },
  {
    slug: 'sports',
    products: [
      {
        title: 'Premium Yoga Mat',
        slug: 'premium-yoga-mat',
        description:
          '6mm thick TPE yoga mat, non-slip surface, alignment lines. Includes carry strap.',
        basePrice: 699,
        img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Purple', color: 'Purple', price: 699, stock: 10 },
          { label: 'Teal Blue', color: 'Teal', price: 699, stock: 8 },
          { label: 'Coral Pink', color: 'Coral', price: 699, stock: 7 },
          { label: 'Charcoal', color: 'Charcoal', price: 699, stock: 9 },
        ],
      },
      {
        title: 'Resistance Bands Set (5 pcs)',
        slug: 'resistance-bands-set',
        description: 'Set of 5 latex resistance bands from 5 to 40 lbs. Home workout essentials.',
        basePrice: 399,
        img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Standard Set', color: 'Multi', price: 399, stock: 15 },
          { label: 'Heavy Set', color: 'Black', price: 499, stock: 10 },
        ],
      },
      {
        title: 'Insulated Sports Water Bottle',
        slug: 'insulated-sports-water-bottle',
        description: '750ml double-wall stainless steel bottle. Keeps cold 24h, hot 12h. BPA-free.',
        basePrice: 299,
        img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Cobalt Blue', color: 'Cobalt Blue', price: 299, stock: 18 },
          { label: 'Midnight Black', color: 'Black', price: 299, stock: 20 },
          { label: 'Olive Green', color: 'Olive', price: 299, stock: 14 },
          { label: 'Rose Gold', color: 'Rose Gold', price: 349, stock: 10 },
        ],
      },
      {
        title: 'Speed Jump Rope',
        slug: 'speed-jump-rope',
        description:
          'Ball-bearing speed rope with adjustable cable. Ideal for CrossFit and cardio workouts.',
        basePrice: 199,
        img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 199, stock: 22 },
          { label: 'Red', color: 'Red', price: 199, stock: 16 },
          { label: 'Blue', color: 'Blue', price: 199, stock: 14 },
        ],
      },
      {
        title: 'Gym Lifting Gloves',
        slug: 'gym-lifting-gloves',
        description:
          'Half-finger gym gloves with wrist support. Anti-slip palm padding for secure grip.',
        basePrice: 349,
        img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Black - S/M', color: 'Black', size: 'S/M', price: 349, stock: 12 },
          { label: 'Black - L/XL', color: 'Black', size: 'L/XL', price: 349, stock: 10 },
          { label: 'Blue - S/M', color: 'Blue', size: 'S/M', price: 349, stock: 8 },
          { label: 'Blue - L/XL', color: 'Blue', size: 'L/XL', price: 349, stock: 7 },
        ],
      },
    ],
  },
  {
    slug: 'footwear',
    products: [
      {
        title: 'Classic White Leather Sneakers',
        slug: 'classic-white-leather-sneakers',
        description:
          'Minimalist full-grain leather sneakers with rubber sole. The timeless everyday shoe.',
        basePrice: 1299,
        img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'White - 38', color: 'White', size: '38', price: 1299, stock: 5 },
          { label: 'White - 39', color: 'White', size: '39', price: 1299, stock: 8 },
          { label: 'White - 40', color: 'White', size: '40', price: 1299, stock: 10 },
          { label: 'White - 42', color: 'White', size: '42', price: 1299, stock: 7 },
          { label: 'Tan - 41', color: 'Tan', size: '41', price: 1399, stock: 5 },
        ],
      },
      {
        title: 'Strappy Flat Sandals',
        slug: 'strappy-flat-sandals',
        description:
          'Genuine leather flat sandals with adjustable ankle strap. Perfect for summer.',
        basePrice: 699,
        img: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Tan - 37', color: 'Tan', size: '37', price: 699, stock: 7 },
          { label: 'Tan - 38', color: 'Tan', size: '38', price: 699, stock: 9 },
          { label: 'Black - 39', color: 'Black', size: '39', price: 699, stock: 8 },
          { label: 'White - 40', color: 'White', size: '40', price: 699, stock: 6 },
        ],
      },
      {
        title: 'Suede Penny Loafers',
        slug: 'suede-penny-loafers',
        description: 'Premium suede penny loafers with a leather sole. Smart-casual elegance.',
        basePrice: 1099,
        img: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Brown - 40', color: 'Brown', size: '40', price: 1099, stock: 6 },
          { label: 'Brown - 42', color: 'Brown', size: '42', price: 1099, stock: 8 },
          { label: 'Black - 41', color: 'Black', size: '41', price: 1099, stock: 5 },
          { label: 'Navy - 43', color: 'Navy', size: '43', price: 1099, stock: 4 },
        ],
      },
      {
        title: 'Running Shoes Pro',
        slug: 'running-shoes-pro',
        description:
          'Breathable mesh upper with responsive foam midsole. Built for performance runs.',
        basePrice: 1599,
        img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Blue/White - 39', color: 'Blue', size: '39', price: 1599, stock: 7 },
          { label: 'Blue/White - 41', color: 'Blue', size: '41', price: 1599, stock: 9 },
          { label: 'Black/Red - 40', color: 'Black', size: '40', price: 1699, stock: 6 },
          { label: 'Black/Red - 42', color: 'Black', size: '42', price: 1699, stock: 5 },
        ],
      },
      {
        title: 'Canvas Slip-On Shoes',
        slug: 'canvas-slip-on-shoes',
        description:
          'Classic canvas slip-on with vulcanized rubber sole. Lightweight and easy to wear.',
        basePrice: 599,
        img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Navy - 38', color: 'Navy', size: '38', price: 599, stock: 10 },
          { label: 'Black - 40', color: 'Black', size: '40', price: 599, stock: 12 },
          { label: 'White - 41', color: 'White', size: '41', price: 599, stock: 8 },
          { label: 'Olive - 42', color: 'Olive', size: '42', price: 599, stock: 6 },
        ],
      },
    ],
  },
  {
    slug: 'accessories',
    products: [
      {
        title: 'Full-Grain Leather Tote Bag',
        slug: 'full-grain-leather-tote-bag',
        description:
          'Spacious full-grain leather tote with interior organizer pockets. A true investment piece.',
        basePrice: 1799,
        img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Cognac Brown', color: 'Cognac', price: 1799, stock: 6 },
          { label: 'Jet Black', color: 'Black', price: 1799, stock: 8 },
          { label: 'Camel', color: 'Camel', price: 1899, stock: 4 },
        ],
      },
      {
        title: 'Polarized Aviator Sunglasses',
        slug: 'polarized-aviator-sunglasses',
        description:
          'UV400 polarized lenses with metal frame. Timeless aviator style for sun protection.',
        basePrice: 549,
        img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Gold/Brown Lens', color: 'Gold', price: 549, stock: 10 },
          { label: 'Silver/Gray Lens', color: 'Silver', price: 549, stock: 9 },
          { label: 'Black/Green Lens', color: 'Black', price: 599, stock: 7 },
        ],
      },
      {
        title: 'Silk Printed Scarf',
        slug: 'silk-printed-scarf',
        description:
          '100% mulberry silk scarf with geometric print. Versatile accessory for any look.',
        basePrice: 699,
        img: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Sapphire Blue', color: 'Blue', price: 699, stock: 8 },
          { label: 'Blush Pink', color: 'Pink', price: 699, stock: 9 },
          { label: 'Crimson Red', color: 'Red', price: 699, stock: 6 },
        ],
      },
      {
        title: 'Slim Leather Bi-Fold Wallet',
        slug: 'slim-leather-bi-fold-wallet',
        description: 'RFID-blocking genuine leather wallet. 6 card slots and a slim profile.',
        basePrice: 549,
        img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Dark Brown', color: 'Brown', price: 549, stock: 12 },
          { label: 'Black', color: 'Black', price: 549, stock: 14 },
          { label: 'Tan', color: 'Tan', price: 549, stock: 8 },
        ],
      },
      {
        title: 'Canvas Weekender Backpack',
        slug: 'canvas-weekender-backpack',
        description:
          '25L waxed canvas backpack with leather accents. Laptop sleeve fits up to 15 inches.',
        basePrice: 899,
        img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 899, stock: 10 },
          { label: 'Navy', color: 'Navy', price: 899, stock: 8 },
          { label: 'Olive', color: 'Olive', price: 949, stock: 6 },
        ],
      },
    ],
  },
  {
    slug: 'kids',
    products: [
      {
        title: 'Organic Cotton Romper',
        slug: 'organic-cotton-romper',
        description: "100% GOTS-certified organic cotton romper. Gentle on baby's sensitive skin.",
        basePrice: 399,
        img: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Sky Blue - 3-6M', color: 'Sky Blue', size: '3-6M', price: 399, stock: 10 },
          { label: 'Blush Pink - 3-6M', color: 'Blush', size: '3-6M', price: 399, stock: 10 },
          { label: 'Lemon - 6-12M', color: 'Yellow', size: '6-12M', price: 399, stock: 8 },
          { label: 'Mint - 1Y', color: 'Mint', size: '1Y', price: 399, stock: 7 },
        ],
      },
      {
        title: 'Kids Graphic Tee Pack (3 pcs)',
        slug: 'kids-graphic-tee-pack',
        description: 'Pack of 3 soft 100% cotton graphic tees with fun Egyptian-themed prints.',
        basePrice: 449,
        img: 'https://images.unsplash.com/photo-1519278409-1f56fdda7fe5?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Multi - 2Y', color: 'Multi', size: '2Y', price: 449, stock: 8 },
          { label: 'Multi - 3Y', color: 'Multi', size: '3Y', price: 449, stock: 9 },
          { label: 'Multi - 4Y', color: 'Multi', size: '4Y', price: 449, stock: 7 },
          { label: 'Multi - 5Y', color: 'Multi', size: '5Y', price: 449, stock: 6 },
        ],
      },
      {
        title: 'Kids Canvas Sneakers',
        slug: 'kids-canvas-sneakers',
        description: 'Durable canvas sneakers with Velcro closure. Easy on/off for active kids.',
        basePrice: 499,
        img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'White - 24', color: 'White', size: '24', price: 499, stock: 8 },
          { label: 'Blue - 26', color: 'Blue', size: '26', price: 499, stock: 9 },
          { label: 'Pink - 27', color: 'Pink', size: '27', price: 499, stock: 7 },
          { label: 'Navy - 29', color: 'Navy', size: '29', price: 499, stock: 6 },
        ],
      },
      {
        title: 'Plush Animal Backpack',
        slug: 'plush-animal-backpack',
        description:
          'Adorable plush animal backpack for toddlers. Padded straps, waterproof lining.',
        basePrice: 349,
        img: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Bunny - Pink', color: 'Pink', price: 349, stock: 10 },
          { label: 'Bear - Brown', color: 'Brown', price: 349, stock: 9 },
          { label: 'Dino - Green', color: 'Green', price: 349, stock: 8 },
        ],
      },
      {
        title: 'Educational Puzzle Set',
        slug: 'educational-puzzle-set',
        description:
          'Set of 4 wooden puzzles featuring Arabic alphabet, numbers, shapes, and animals.',
        basePrice: 599,
        img: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Arabic Letters', color: 'Multi', price: 599, stock: 12 },
          { label: 'Numbers & Shapes', color: 'Multi', price: 599, stock: 10 },
        ],
      },
    ],
  },
  {
    slug: 'jewelry',
    products: [
      {
        title: 'Sterling Silver Chain Necklace',
        slug: 'sterling-silver-chain-necklace',
        description:
          '925 sterling silver 45cm cable chain necklace. Timeless elegance for everyday wear.',
        basePrice: 999,
        img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Silver - 40cm', color: 'Silver', size: '40cm', price: 999, stock: 10 },
          { label: 'Silver - 45cm', color: 'Silver', size: '45cm', price: 999, stock: 12 },
          { label: '18k Gold Plated - 45cm', color: 'Gold', size: '45cm', price: 1299, stock: 8 },
        ],
      },
      {
        title: 'Gold-Filled Hoop Earrings',
        slug: 'gold-filled-hoop-earrings',
        description:
          '14k gold-filled hoop earrings in three sizes. Lightweight and tarnish-resistant.',
        basePrice: 799,
        img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop',
        isFeatured: true,
        variants: [
          { label: 'Gold - Small (20mm)', color: 'Gold', size: '20mm', price: 799, stock: 12 },
          { label: 'Gold - Medium (30mm)', color: 'Gold', size: '30mm', price: 899, stock: 10 },
          { label: 'Silver - Small (20mm)', color: 'Silver', size: '20mm', price: 799, stock: 9 },
          { label: 'Rose Gold - Medium', color: 'Rose Gold', size: '30mm', price: 949, stock: 7 },
        ],
      },
      {
        title: 'Beaded Friendship Bracelet',
        slug: 'beaded-friendship-bracelet',
        description:
          'Handmade glass bead bracelet with adjustable cord. Bohemian style meets Egyptian craft.',
        basePrice: 349,
        img: 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Turquoise Blue', color: 'Turquoise', price: 349, stock: 15 },
          { label: 'Pearl White', color: 'White', price: 349, stock: 12 },
          { label: 'Multicolor', color: 'Multi', price: 349, stock: 10 },
        ],
      },
      {
        title: 'Adjustable Statement Ring',
        slug: 'adjustable-statement-ring',
        description:
          'Bold geometric statement ring in sterling silver or gold-plated brass. One size fits all.',
        basePrice: 599,
        img: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Silver', color: 'Silver', price: 599, stock: 10 },
          { label: 'Gold', color: 'Gold', price: 699, stock: 9 },
          { label: 'Rose Gold', color: 'Rose Gold', price: 699, stock: 7 },
        ],
      },
      {
        title: 'Layered Anklet Set',
        slug: 'layered-anklet-set',
        description:
          'Set of 3 dainty layering anklets — chain, bead, and charm styles. Mix and match.',
        basePrice: 449,
        img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=crop',
        isFeatured: false,
        variants: [
          { label: 'Gold', color: 'Gold', price: 449, stock: 10 },
          { label: 'Silver', color: 'Silver', price: 449, stock: 11 },
        ],
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding Brandy database (zero-data mode)...');

  // ── Clean up first ───────────────────────────────────────────────────────
  await prisma.passwordResetToken.deleteMany();
  await prisma.promoCodeUsage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.homepageBanner.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.productQA.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.affiliateReferral.deleteMany();
  await prisma.affiliateBonus.deleteMany();
  await prisma.affiliatePayout.deleteMany();
  await prisma.affiliate.deleteMany();
  await prisma.affiliateTierConfig.deleteMany();
  await prisma.affiliateGlobalSettings.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Categories (catalog scaffolding) ──────────────────────────────────────
  const categoriesData = [
    { name: 'Women', nameAr: 'نساء', slug: 'women' },
    { name: 'Men', nameAr: 'رجال', slug: 'men' },
    { name: 'Kids', nameAr: 'أطفال', slug: 'kids' },
    { name: 'Electronics', nameAr: 'إلكترونيات', slug: 'electronics' },
    { name: 'Home', nameAr: 'منزل', slug: 'home' },
    { name: 'Beauty', nameAr: 'جمال', slug: 'beauty' },
    { name: 'Sports', nameAr: 'رياضة', slug: 'sports' },
    { name: 'Footwear', nameAr: 'أحذية', slug: 'footwear' },
    { name: 'Accessories', nameAr: 'إكسسوارات', slug: 'accessories' },
    { name: 'Toys', nameAr: 'ألعاب', slug: 'toys' },
    { name: 'Appliances', nameAr: 'أجهزة منزلية', slug: 'appliances' },
    { name: 'Groceries', nameAr: 'سوبرماركت', slug: 'groceries' },
    { name: 'Auto', nameAr: 'سيارات', slug: 'auto' },
    { name: 'Furniture', nameAr: 'أثاث', slug: 'furniture' },
    { name: 'Books', nameAr: 'كتب', slug: 'books' },
    { name: 'Health', nameAr: 'صحة', slug: 'health' },
    { name: 'Pets', nameAr: 'حيوانات أليفة', slug: 'pets' },
    { name: 'Jewelry', nameAr: 'مجوهرات', slug: 'jewelry' },
    { name: 'Garden', nameAr: 'حديقة', slug: 'garden' },
    { name: 'Pharma', nameAr: 'صيدلية', slug: 'pharma' },
  ];

  await Promise.all(categoriesData.map(c => prisma.category.create({ data: c })));
  console.log(`✅ ${categoriesData.length} categories created`);

  // ── Users ───────────────────────────────────────────────────────────────
  // Loyalty points, balances and counters all start at zero.
  const adminPwHash = await bcrypt.hash('admin1234', 12);
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@admin.com',
      passwordHash: adminPwHash,
      role: 'ADMIN',
      loyaltyPoints: 0,
    },
  });

  const sellerPwHash = await bcrypt.hash('seller1234', 12);
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Demo Seller',
      email: 'seller@seller.com',
      passwordHash: sellerPwHash,
      role: 'SELLER',
      loyaltyPoints: 0,
      emailVerified: new Date(), // verified email is required to publish products
    },
  });
  const defaultSellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: 'Demo Store',
      description: 'The default demo store showcasing sample products.',
      status: 'ACTIVE',
      balance: 0,
      commissionRate: 0.15,
    },
  });

  const SELLER_BRANDS = [
    {
      name: 'Cairo Loom',
      email: 'cairoloom@brandy.com',
      desc: 'Premium Egyptian linen shirts and breathable summer garments.',
    },
    {
      name: 'Alexandria Leatherworks',
      email: 'alexleather@brandy.com',
      desc: 'Handcrafted genuine leather bags, belts, and accessories.',
    },
    {
      name: 'Oasis Terracotta',
      email: 'oasisclay@brandy.com',
      desc: 'Clay pots, kitchenware, and custom home accents from Tunis Village, Fayoum.',
    },
    {
      name: 'Nile Threads',
      email: 'nilethreads@brandy.com',
      desc: 'Organic Egyptian cotton basic tees, loungewear, and daily essentials.',
    },
    {
      name: 'Giza Cotton Co.',
      email: 'gizacotton@brandy.com',
      desc: 'World-renowned Egyptian cotton bedding, bathrobes, and luxury linens.',
    },
    {
      name: 'Damietta Woodcraft',
      email: 'damiettawood@brandy.com',
      desc: 'Artisanal wood furniture, serving trays, and custom wooden home decor.',
    },
    {
      name: 'Delta Electronics',
      email: 'deltatech@brandy.com',
      desc: 'Smart smart accessories, custom power banks, and local tech hardware.',
    },
    {
      name: 'Lotus Botanicals',
      email: 'lotusbeauty@brandy.com',
      desc: 'Natural Egyptian skincare, oils, and organic hair treatment remedies.',
    },
    {
      name: 'Luxor Goldsmiths',
      email: 'luxorgold@brandy.com',
      desc: 'Handmade sterling silver and gold-plated jewelry inspired by heritage.',
    },
    {
      name: 'Nubian Heritage Crafts',
      email: 'nubiancrafts@brandy.com',
      desc: 'Handwoven baskets, colorful rugs, and traditional home ornaments.',
    },
    {
      name: 'Suez Activewear',
      email: 'suezactive@brandy.com',
      desc: 'Athletic wear, performance training jerseys, and Egyptian outdoor gear.',
    },
    {
      name: 'Mansoura Loom',
      email: 'mansouraloom@brandy.com',
      desc: 'Premium knitwear, cozy cardigans, and seasonal Egyptian garments.',
    },
    {
      name: 'Tanta Gourmet',
      email: 'tantagourmet@brandy.com',
      desc: 'Artisanal local spices, organic honey, and sweet traditional delicacies.',
    },
    {
      name: 'Siwa Organics',
      email: 'siwaorganics@brandy.com',
      desc: 'Organic dates, premium olive oil, and natural bath salts from Siwa Oasis.',
    },
    {
      name: 'Sinai Herbals',
      email: 'sinaiherbal@brandy.com',
      desc: 'Organic Sinai teas, hand-harvested herbs, and therapeutic remedies.',
    },
    {
      name: 'Port Said Gear',
      email: 'portsaidgear@brandy.com',
      desc: 'Premium travel bags, windbreakers, and durable Egyptian outdoor packs.',
    },
    {
      name: 'Assiut Loom Heritage',
      email: 'assiutloom@brandy.com',
      desc: 'Tally fabrics, traditional shawls, and ancient Assiut weaving designs.',
    },
    {
      name: 'Qena Pottery',
      email: 'qenapottery@brandy.com',
      desc: 'Porous water jars, clay planters, and functional terracotta storage.',
    },
    {
      name: 'Kemet Fashion House',
      email: 'kemetfashion@brandy.com',
      desc: 'Contemporary Egyptian streetwear and custom graphic tees.',
    },
    {
      name: 'Pharaoh Timepieces',
      email: 'pharaohtime@brandy.com',
      desc: 'Premium handcrafted wooden watches and local desk clocks.',
    },
  ];

  const addedSellerProfiles = [];
  for (let i = 0; i < SELLER_BRANDS.length; i++) {
    const brand = SELLER_BRANDS[i];
    const u = await prisma.user.create({
      data: {
        name: brand.name,
        email: brand.email,
        passwordHash: sellerPwHash, // reuse same hash for convenience
        role: 'SELLER',
        loyaltyPoints: 0,
        emailVerified: new Date(), // verified email is required to publish products
      },
    });
    const sp = await prisma.sellerProfile.create({
      data: {
        userId: u.id,
        storeName: brand.name,
        description: brand.desc,
        status: 'ACTIVE',
        balance: 0,
        commissionRate: 0.15,
      },
    });
    addedSellerProfiles.push(sp);
  }

  const buyerPwHash = await bcrypt.hash('user1234', 12);
  await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'user@user.com',
      passwordHash: buyerPwHash,
      role: 'BUYER',
      loyaltyPoints: 0,
    },
  });

  // Affiliate demo account — BUYER role + approved Affiliate record
  const affiliatePwHash = await bcrypt.hash('affiliate1234', 12);
  const affiliateUser = await prisma.user.create({
    data: {
      name: 'Demo Affiliate',
      email: 'affiliate@demo.com',
      passwordHash: affiliatePwHash,
      role: 'BUYER',
      loyaltyPoints: 0,
    },
  });
  await prisma.affiliate.create({
    data: {
      userId: affiliateUser.id,
      promoCode: 'DEMO15',
      referralSlug: 'demo-affiliate',
      status: 'ACTIVE',
      tier: 'STARTER',
      platform: 'Instagram',
      platformFollowers: 5000,
      categoryFocus: 'Fashion',
      approvedAt: new Date(),
    },
  });

  console.log('✅ Starter accounts created (admin / seller / buyer / affiliate)');
  console.log('   No sample orders, points, balances or reviews — start clean.');

  // ── Affiliate Program Scaffolding ──────────────────────────────────────────
  const tiers = [
    { tier: 'STARTER', name: 'Starter', minConversions: 0, commissionPct: 5 },
    { tier: 'SILVER', name: 'Silver', minConversions: 20, commissionPct: 6 },
    { tier: 'GOLD', name: 'Gold', minConversions: 84, commissionPct: 8 },
    { tier: 'PLATINUM', name: 'Platinum', minConversions: 200, commissionPct: 12 },
  ];

  for (const t of tiers) {
    await prisma.affiliateTierConfig.create({
      data: {
        tier: t.tier as AffiliateTier,
        name: t.name,
        minConversions: t.minConversions,
        commissionPct: t.commissionPct,
        isActive: true,
      },
    });
  }

  await prisma.affiliateGlobalSettings.create({
    data: {
      id: 'global',
      defaultDiscountPct: 15,
      maxDiscountPct: 30,
      referrerBonusEgp: 50,
      joinerBonusEgp: 30,
      bonusExpiryDays: 90,
      bonusesEnabled: true,
      programEnabled: true,
    },
  });
  console.log('✅ Affiliate tiers and global settings seeded');

  // ── Sample products ────────────────────────────────────────────────────────
  const allCategories = await prisma.category.findMany();
  const catMap: Record<string, string> = {};
  allCategories.forEach(c => {
    catMap[c.slug] = c.id;
  });

  let productCount = 0;
  let variantCount = 0;

  const arTitles: Record<string, string> = {
    'Floral Linen Midi Dress': 'فستان ميدي من الكتان بنقشة الزهور',
    'Classic Linen Blouse': 'بلوزة كتان كلاسيكية',
    'Wide-Leg Trousers': 'بنطلون واسع الساق',
    'Wrap Maxi Dress': 'فستان ماكسي ملفوف',
    'Cropped Ribbed Top': 'توب مضلع قصير',
    'Wireless Noise-Cancelling Headphones': 'سماعات رأس لاسلكية عازلة للضوضاء',
    'USB-C 65W GaN Charger': 'شاحن GaN بقوة 65 واط USB-C',
    'Portable Bluetooth Speaker': 'مكبر صوت بلوتوث محمول',
    'Smart Watch Pro': 'ساعة ذكية برو',
    'True Wireless Earbuds': 'سماعات أذن لاسلكية بالكامل',
    'Luxury Throw Pillow Set (2 pcs)': 'طقم وسائد ديكور فاخرة (قطعتين)',
    'Soy Wax Scented Candle Set': 'طقم شموع معطرة من شمع الصويا',
    'Bamboo Storage Basket Set': 'طقم سلات تخزين من الخيزران',
    'Handmade Ceramic Vase': 'فازة سيراميك مصنوعة يدوياً',
    'Acacia Wood Serving Board': 'لوح تقديم من خشب الأكاسيا',
    'Vitamin C Brightening Serum': 'سيروم فيتامين سي للتفتيح',
    'Egyptian Rose Water Toner': 'تونر ماء الورد المصري',
    'Argan Oil Hair Mask': 'ماسك الشعر بزيت الأرجان',
    'Natural Lip Balm Set': 'طقم مرطب شفاه طبيعي',
  };

  const arEditions: Record<string, string> = {
    Collection: 'مجموعة التشكيلة',
    'Special Edition': 'إصدار خاص',
    'Signature Series': 'سلسلة التوقيع',
    'Classic Fit': 'مقاس كلاسيكي',
  };

  const getArabicVariantTitle = (label: string, edName: string) => {
    const edAr = arEditions[edName] || edName;
    const parts = label.split(' - ');
    const colorMapAr: Record<string, string> = {
      Blue: 'أزرق',
      Pink: 'وردي',
      White: 'أبيض',
      Beige: 'بيج',
      Black: 'أسود',
      Camel: 'جملي',
      Navy: 'كحلي',
      Emerald: 'زمردي',
      Burgundy: 'برغندي',
      'Midnight Black': 'أسود منتصف الليل',
      'Pearl White': 'أبيض لؤلؤي',
      'Deep Blue': 'أزرق داكن',
      'Jet Black': 'أسود فاحم',
      'Coral Red': 'أحمر مرجاني',
      'Forest Green': 'أخضر الغابة',
      'Obsidian Black': 'أسود أوبسيديان',
      Silver: 'فضي',
      'Rose Gold': 'ذهبي وردي',
      'Dusty Blue': 'أزرق غباري',
      Terracotta: 'تيراكوتا',
      'Warm Gray': 'رمادي دافئ',
      Lavender: 'لافندر',
      Rose: 'ورد',
      Jasmine: 'ياسمين',
      Natural: 'طبيعي',
      Espresso: 'إسبريسو',
      Ivory: 'عاجي',
      Sage: 'مرمية',
      'Midnight Blue': 'أزرق منتصف الليل',
      Small: 'صغير',
      Large: 'كبير',
      '30ml': '٣٠ مل',
      '50ml': '٥٠ مل',
      '200ml': '٢٠٠ مل',
      '400ml': '٤٠٠ مل',
      '250ml': '٢٥٠ مل',
      '500ml': '٥٠٠ مل',
      Cherry: 'كرز',
      Mint: 'نعناع',
      Honey: 'عسل',
    };
    const colorAr = colorMapAr[parts[0]] || parts[0];
    const sizeAr = parts[1] ? ` - ${parts[1]}` : '';
    return `${colorAr}${sizeAr} - ${edAr}`;
  };

  for (const catData of CATALOG) {
    const categoryId = catMap[catData.slug];
    if (!categoryId) {
      console.warn(`  ⚠️  Category "${catData.slug}" not found, skipping`);
      continue;
    }

    // Multiply catalog depth to populate category listings (4 copies of each seed item)
    // to resolve B-027 (Category pages show single-digit inventory).
    const editions = ['Collection', 'Special Edition', 'Signature Series', 'Classic Fit'];

    for (const p of catData.products) {
      for (let i = 0; i < editions.length; i++) {
        const editionName = editions[i];
        const targetSeller =
          addedSellerProfiles[productCount % addedSellerProfiles.length] || defaultSellerProfile;

        const title = `${p.title} (${editionName})`;
        const baseAr = arTitles[p.title] || p.title;
        const edAr = arEditions[editionName] || editionName;
        const titleAr = `${baseAr} (${edAr})`;
        const slug = `${p.slug}-${editionName.toLowerCase().replace(/\s+/g, '-')}`;

        const product = await prisma.product.create({
          data: {
            sellerId: targetSeller.id,
            categoryId,
            title,
            titleAr,
            slug,
            description: `${p.description} Part of the exclusive ${editionName} curated by ${targetSeller.storeName}. High-quality Egyptian craftsmanship guaranteed.`,
            descriptionAr: `وصف مترجم: ${p.description} جزء من الإصدار المميز ${edAr} المختار بعناية بواسطة ${targetSeller.storeName}. جودة وإتقان مصري مضمون.`,
            basePrice: p.basePrice + i * 50, // slightly vary the prices
            published: true,
            isFeatured: i === 0 ? p.isFeatured : false,
            condition: 'NEW',
            countryOfOrigin: 'Egypt',
            isVerifiedLocal: true,
          },
        });
        productCount++;

        // Product image
        await prisma.productImage.create({
          data: { productId: product.id, url: p.img, isPrimary: true },
        });

        // Variants
        for (let vi = 0; vi < p.variants.length; vi++) {
          const v = p.variants[vi];
          const attrs: Record<string, string> = {};
          if (v.color) attrs.color = v.color;
          if (v.size) attrs.size = v.size;

          await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: `${slug}-v${vi + 1}`,
              title: `${v.label} - ${editionName}`,
              titleAr: getArabicVariantTitle(v.label, editionName),
              attributes: JSON.stringify(attrs),
              price: v.price + i * 50,
              stockCount: v.stock,
            },
          });
          variantCount++;
        }
      }
    }
  }

  console.log(
    `✅ Sample products created: ${productCount} products, ${variantCount} variants across ${CATALOG.length} categories`
  );

  // ── Homepage Banners ───────────────────────────────────────────────────────
  await prisma.homepageBanner.createMany({
    data: [
      // Slot 0 — Main Carousel
      {
        title: 'Redefining Urban Elegance',
        subtitle: 'Seasonal Collection 2026',
        imageUrl:
          'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=75&w=1200&auto=format&fit=crop',
        linkUrl: '/shop',
        ctaLabel: 'Shop Now',
        position: 0,
        isActive: true,
      },
      {
        title: 'Premium Local Craft',
        subtitle: 'Handmade in Egypt',
        imageUrl:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=75&w=1200&auto=format&fit=crop',
        linkUrl: '/shop',
        ctaLabel: 'Shop Now',
        position: 0,
        isActive: true,
      },
      {
        title: 'New Modern Arrivals',
        subtitle: 'Fresh Trends',
        imageUrl:
          'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=75&w=1200&auto=format&fit=crop',
        linkUrl: '/shop',
        ctaLabel: 'Shop Now',
        position: 0,
        isActive: true,
      },
      // Slot 1 — Right Top Banner Carousel
      {
        title: 'Next-Gen Footwear',
        subtitle: 'Up to 40% Off Brands',
        imageUrl:
          'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=75&w=600&auto=format&fit=crop',
        linkUrl: '/shoes',
        position: 1,
        isActive: true,
      },
      {
        title: 'Active Trainer Hub',
        subtitle: 'Performance Gear',
        imageUrl:
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=75&w=600&auto=format&fit=crop',
        linkUrl: '/shoes',
        position: 1,
        isActive: true,
      },
      {
        title: 'Everyday Streetwear',
        subtitle: 'Walk in Style',
        imageUrl:
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=75&w=600&auto=format&fit=crop',
        linkUrl: '/shoes',
        position: 1,
        isActive: true,
      },
      // Slot 2 — Right Bottom Banner Carousel
      {
        title: 'Timeless Design',
        subtitle: 'Curated Accessories',
        imageUrl:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=75&w=600&auto=format&fit=crop',
        linkUrl: '/watches',
        position: 2,
        isActive: true,
      },
      {
        title: 'Premium Timepieces',
        subtitle: 'Precision Quality',
        imageUrl:
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=75&w=600&auto=format&fit=crop',
        linkUrl: '/watches',
        position: 2,
        isActive: true,
      },
      {
        title: 'Artisanal Carrybags',
        subtitle: 'Handmade Genuine Leather',
        imageUrl:
          'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=75&w=600&auto=format&fit=crop',
        linkUrl: '/shop',
        position: 2,
        isActive: true,
      },
    ],
  });

  console.log('\n🎉 Seeding complete!');
  console.log('Login credentials:');
  console.log('  Admin:     admin@admin.com / admin1234         → /admin-os');
  console.log('  Seller:    seller@seller.com / seller1234      → /seller-hub');
  console.log('  Buyer:     user@user.com / user1234            → /dashboard');
  console.log('  Affiliate: affiliate@demo.com / affiliate1234  → /dashboard (promo: DEMO15)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
