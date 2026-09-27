import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import bcrypt from 'bcryptjs';

interface SeedVariant {
  label: string;
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
  name: string;
  slug: string;
  products: SeedProduct[];
}

const CATALOG: SeedCategory[] = [
  // ── 1. WOMEN ──────────────────────────────────────────────────────────────
  {
    name: 'Women',
    slug: 'women',
    products: [
      {
        title: 'Women Casual Printed Abaya Dress – Lightweight Maxi',
        slug: 'women-casual-printed-abaya-dress',
        description:
          'Soft flowy printed abaya maxi dress ideal for everyday modest wear. Breathable fabric keeps you cool in Egyptian heat. Available in multiple prints and sizes.',
        basePrice: 330,
        img: 'https://m.media-amazon.com/images/I/618jgxjiJuL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black - S', color: 'Black', size: 'S', price: 330, stock: 12 },
          { label: 'Black - M', color: 'Black', size: 'M', price: 330, stock: 15 },
          { label: 'Black - L', color: 'Black', size: 'L', price: 330, stock: 10 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 330, stock: 8 },
          { label: 'Navy - L', color: 'Navy', size: 'L', price: 330, stock: 7 },
        ],
      },
      {
        title: 'Classic Linen Blouse – Relaxed Collar Shirt',
        slug: 'classic-linen-blouse-women',
        description:
          'Relaxed-fit linen blouse with a subtle collar. Pairs with anything from jeans to palazzo pants. Egyptian linen for superior softness and breathability.',
        basePrice: 479,
        img: 'https://m.media-amazon.com/images/I/81JX8lAOB4L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - XS', color: 'White', size: 'XS', price: 479, stock: 10 },
          { label: 'White - S', color: 'White', size: 'S', price: 479, stock: 9 },
          { label: 'Beige - M', color: 'Beige', size: 'M', price: 479, stock: 8 },
          { label: 'Sage Green - L', color: 'Sage Green', size: 'L', price: 479, stock: 6 },
        ],
      },
      {
        title: 'Wide-Leg Palazzo Trousers – Premium Cotton Blend',
        slug: 'wide-leg-palazzo-trousers',
        description:
          'Flowing wide-leg palazzo trousers in premium cotton blend. Elegant silhouette for work or outings. Comfortable elastic waist for all-day wear.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/61l54IAnbYL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Camel - XS', color: 'Camel', size: 'XS', price: 629, stock: 7 },
          { label: 'Black - S', color: 'Black', size: 'S', price: 629, stock: 11 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 629, stock: 8 },
          { label: 'Black - L', color: 'Black', size: 'L', price: 629, stock: 5 },
        ],
      },
      {
        title: 'Wrap Maxi Dress – Soft Crepe Fabric',
        slug: 'wrap-maxi-dress-crepe',
        description:
          'Elegant wrap maxi dress in soft crepe fabric. Flattering V-neckline and adjustable waist tie. Perfect for special occasions and evening outings.',
        basePrice: 1129,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Emerald - S', color: 'Emerald', size: 'S', price: 1129, stock: 5 },
          { label: 'Burgundy - M', color: 'Burgundy', size: 'M', price: 1129, stock: 7 },
          { label: 'Dusty Rose - L', color: 'Dusty Rose', size: 'L', price: 1129, stock: 4 },
        ],
      },
      {
        title: 'Cropped Ribbed Knit Top – Wardrobe Essential',
        slug: 'cropped-ribbed-knit-top',
        description:
          'Soft ribbed-knit cropped top. A wardrobe essential for casual everyday wear. Pairs beautifully with high-waist jeans or skirts.',
        basePrice: 329,
        img: 'https://m.media-amazon.com/images/I/81JX8lAOB4L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - XS', color: 'White', size: 'XS', price: 329, stock: 15 },
          { label: 'Black - S', color: 'Black', size: 'S', price: 329, stock: 14 },
          { label: 'Blush - M', color: 'Blush', size: 'M', price: 329, stock: 10 },
          { label: 'Gray - L', color: 'Gray', size: 'L', price: 329, stock: 8 },
        ],
      },
      {
        title: 'Floral Linen Midi Dress – Summer Collection',
        slug: 'floral-linen-midi-dress-summer',
        description:
          'Lightweight 100% linen midi dress with a bold floral print. Side pockets and a relaxed fit. Perfect for warm Egyptian summers.',
        basePrice: 829,
        img: 'https://m.media-amazon.com/images/I/618jgxjiJuL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Blue Floral - S', color: 'Blue', size: 'S', price: 829, stock: 8 },
          { label: 'Pink Floral - M', color: 'Pink', size: 'M', price: 829, stock: 12 },
          { label: 'White Floral - L', color: 'White', size: 'L', price: 829, stock: 5 },
        ],
      },
      {
        title: "Women's High-Waist Skinny Jeans – Stretch Denim",
        slug: 'womens-high-waist-skinny-jeans',
        description:
          'Classic high-waist skinny jeans in stretch denim. Comfortable all-day fit with a flattering silhouette. Available in multiple washes.',
        basePrice: 749,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Dark Wash - 28', color: 'Dark Blue', size: '28', price: 749, stock: 10 },
          { label: 'Dark Wash - 30', color: 'Dark Blue', size: '30', price: 749, stock: 12 },
          { label: 'Light Wash - 28', color: 'Light Blue', size: '28', price: 749, stock: 8 },
          { label: 'Black - 30', color: 'Black', size: '30', price: 749, stock: 7 },
        ],
      },
      {
        title: "Women's Cotton Oversized Hoodie – Cozy Streetwear",
        slug: 'womens-cotton-oversized-hoodie',
        description:
          'Cozy oversized hoodie in soft brushed cotton fleece. Kangaroo pocket and adjustable drawstring hood. Perfect for lazy days or street-style looks.',
        basePrice: 599,
        img: 'https://m.media-amazon.com/images/I/618jgxjiJuL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Beige - S', color: 'Beige', size: 'S', price: 599, stock: 10 },
          { label: 'Gray - M', color: 'Gray', size: 'M', price: 599, stock: 13 },
          { label: 'Black - L', color: 'Black', size: 'L', price: 599, stock: 9 },
          { label: 'Dusty Pink - XL', color: 'Pink', size: 'XL', price: 599, stock: 6 },
        ],
      },
      {
        title: "Women's Modest Swimwear Set – Burkini 3-Piece",
        slug: 'womens-modest-burkini-swimwear',
        description:
          '3-piece modest swimwear set (tunic, pants, cap). Quick-dry stretchy fabric with UV protection. Suitable for pool and beach.',
        basePrice: 879,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - S', color: 'Black', size: 'S', price: 879, stock: 8 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 879, stock: 10 },
          { label: 'Teal - L', color: 'Teal', size: 'L', price: 879, stock: 6 },
        ],
      },
      {
        title: "Women's Silk Satin Pajama Set – Loungewear",
        slug: 'womens-silk-satin-pajama-set',
        description:
          'Luxurious satin pajama set with a long-sleeve top and matching pants. Smooth and cool against the skin. Ideal for sleep or lounging at home.',
        basePrice: 549,
        img: 'https://m.media-amazon.com/images/I/618jgxjiJuL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Dusty Rose - S', color: 'Dusty Rose', size: 'S', price: 549, stock: 10 },
          { label: 'Champagne - M', color: 'Champagne', size: 'M', price: 549, stock: 9 },
          { label: 'Black - L', color: 'Black', size: 'L', price: 549, stock: 8 },
        ],
      },
    ],
  },

  // ── 2. MEN ────────────────────────────────────────────────────────────────
  {
    name: 'Men',
    slug: 'men',
    products: [
      {
        title: "Men's Oxford Button-Down Shirt – Egyptian Cotton",
        slug: 'mens-oxford-button-down-shirt',
        description:
          'Classic Egyptian cotton Oxford shirt. Versatile enough for work or weekend. Wrinkle-resistant finish keeps you looking sharp all day.',
        basePrice: 579,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'White - S', color: 'White', size: 'S', price: 579, stock: 12 },
          { label: 'Light Blue - M', color: 'Light Blue', size: 'M', price: 579, stock: 14 },
          { label: 'Charcoal - L', color: 'Charcoal', size: 'L', price: 579, stock: 9 },
          { label: 'White - XL', color: 'White', size: 'XL', price: 579, stock: 6 },
        ],
      },
      {
        title: "Men's Slim Fit Chinos – Stretch Cotton",
        slug: 'mens-slim-fit-chinos',
        description:
          'Modern slim-fit chinos in stretch cotton. Comfortable all day, every day. Five-pocket design in multiple earthy tones.',
        basePrice: 729,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Beige - 30', color: 'Beige', size: '30', price: 729, stock: 8 },
          { label: 'Navy - 32', color: 'Navy', size: '32', price: 729, stock: 11 },
          { label: 'Olive - 34', color: 'Olive', size: '34', price: 729, stock: 7 },
          { label: 'Black - 36', color: 'Black', size: '36', price: 729, stock: 5 },
        ],
      },
      {
        title: "Men's Linen Summer Shirt – 100% Pure Linen",
        slug: 'mens-linen-summer-shirt',
        description:
          '100% linen short-sleeve shirt. The essential Egyptian summer staple. Ultra-breathable and gets softer with every wash.',
        basePrice: 529,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Off-White - S', color: 'Off-White', size: 'S', price: 529, stock: 10 },
          { label: 'Sky Blue - M', color: 'Sky Blue', size: 'M', price: 529, stock: 12 },
          { label: 'Mint - L', color: 'Mint', size: 'L', price: 529, stock: 8 },
        ],
      },
      {
        title: "Men's Classic Piqué Polo Shirt – Multi-Color",
        slug: 'mens-classic-pique-polo-shirt',
        description:
          'Piqué polo shirt with a clean structured collar. Egyptian cotton for superior softness and breathability. A wardrobe cornerstone in 4 colors.',
        basePrice: 479,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Navy - S', color: 'Navy', size: 'S', price: 479, stock: 8 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 479, stock: 10 },
          { label: 'White - M', color: 'White', size: 'M', price: 479, stock: 13 },
          { label: 'Red - L', color: 'Red', size: 'L', price: 479, stock: 7 },
          { label: 'Forest Green - XL', color: 'Forest Green', size: 'XL', price: 479, stock: 5 },
        ],
      },
      {
        title: "Men's Cargo Jogger Pants – Urban Streetwear",
        slug: 'mens-cargo-jogger-pants',
        description:
          'Urban cargo joggers with multiple pockets. Comfortable stretchy waistband and tapered leg. Ideal for casual outings and streetwear looks.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Khaki - S', color: 'Khaki', size: 'S', price: 629, stock: 8 },
          { label: 'Black - M', color: 'Black', size: 'M', price: 629, stock: 14 },
          { label: 'Olive - L', color: 'Olive', size: 'L', price: 629, stock: 7 },
        ],
      },
      {
        title: "Men's Premium T-Shirt 3-Pack – 100% Cotton",
        slug: 'mens-premium-tshirt-3pack',
        description:
          "Pack of 3 premium round-neck T-shirts in 100% combed cotton. Preshrunk and colorfast. Essential basics for every man's wardrobe.",
        basePrice: 449,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White/Gray/Black - S', color: 'Multi', size: 'S', price: 449, stock: 12 },
          { label: 'White/Gray/Black - M', color: 'Multi', size: 'M', price: 449, stock: 15 },
          { label: 'White/Gray/Black - L', color: 'Multi', size: 'L', price: 449, stock: 10 },
          { label: 'White/Gray/Black - XL', color: 'Multi', size: 'XL', price: 449, stock: 8 },
        ],
      },
      {
        title: "Men's Casual Sneaker – Breathable Mesh Upper",
        slug: 'mens-casual-sneaker-mesh',
        description:
          'Lightweight daily sneaker with breathable mesh upper and cushioned insole. Ideal for walking and casual outings.',
        basePrice: 749,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - 40', color: 'White', size: '40', price: 749, stock: 10 },
          { label: 'Black - 42', color: 'Black', size: '42', price: 749, stock: 9 },
          { label: 'Navy - 44', color: 'Navy', size: '44', price: 749, stock: 7 },
        ],
      },
      {
        title: "Men's Slim Stretch Formal Trousers",
        slug: 'mens-slim-stretch-formal-trousers',
        description:
          'Tailored slim-fit formal trousers in stretch polyester-viscose. Flat front and partial elastic waistband for all-day comfort during office wear.',
        basePrice: 849,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - 30', color: 'Black', size: '30', price: 849, stock: 10 },
          { label: 'Charcoal - 32', color: 'Charcoal', size: '32', price: 849, stock: 9 },
          { label: 'Navy - 34', color: 'Navy', size: '34', price: 849, stock: 7 },
        ],
      },
      {
        title: "Men's Hooded Zip-Up Sweatshirt – Fleece Lined",
        slug: 'mens-hooded-zipup-sweatshirt',
        description:
          'Warm zip-up hoodie with fleece lining and kangaroo pocket. Two side zip pockets and adjustable drawstring. Perfect for cooler Egyptian evenings.',
        basePrice: 699,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Gray - S', color: 'Gray', size: 'S', price: 699, stock: 10 },
          { label: 'Navy - M', color: 'Navy', size: 'M', price: 699, stock: 12 },
          { label: 'Black - L', color: 'Black', size: 'L', price: 699, stock: 8 },
          { label: 'Burgundy - XL', color: 'Burgundy', size: 'XL', price: 699, stock: 5 },
        ],
      },
      {
        title: "Men's Woven Leather Belt – Classic Buckle",
        slug: 'mens-woven-leather-belt',
        description:
          'Genuine leather woven belt with a polished silver buckle. Fits waist sizes 28–42 inches. Durable and versatile for casual and formal wear.',
        basePrice: 379,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - 90cm', color: 'Black', size: '90cm', price: 379, stock: 15 },
          { label: 'Brown - 100cm', color: 'Brown', size: '100cm', price: 379, stock: 12 },
          { label: 'Tan - 110cm', color: 'Tan', size: '110cm', price: 379, stock: 10 },
        ],
      },
    ],
  },

  // ── 3. KIDS ───────────────────────────────────────────────────────────────
  {
    name: 'Kids',
    slug: 'kids',
    products: [
      {
        title: 'Kids Graphic Tee 3-Pack – Egyptian Themed Prints',
        slug: 'kids-graphic-tee-3pack',
        description:
          'Pack of 3 soft 100% cotton graphic tees with fun Egyptian-themed prints. Pre-shrunk and colorfast for long-lasting wear through playtime.',
        basePrice: 479,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Multi - 2Y', color: 'Multi', size: '2Y', price: 479, stock: 8 },
          { label: 'Multi - 3Y', color: 'Multi', size: '3Y', price: 479, stock: 9 },
          { label: 'Multi - 4Y', color: 'Multi', size: '4Y', price: 479, stock: 7 },
          { label: 'Multi - 5Y', color: 'Multi', size: '5Y', price: 479, stock: 6 },
        ],
      },
      {
        title: 'Organic Cotton Baby Romper – GOTS Certified',
        slug: 'organic-cotton-baby-romper',
        description:
          "100% GOTS-certified organic cotton romper. Gentle on baby's sensitive skin with snap-button closure for easy diaper changes.",
        basePrice: 429,
        img: 'https://m.media-amazon.com/images/I/71FoOjGYiDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Sky Blue - 0-3M', color: 'Sky Blue', size: '0-3M', price: 429, stock: 10 },
          { label: 'Blush Pink - 3-6M', color: 'Blush', size: '3-6M', price: 429, stock: 10 },
          { label: 'Lemon - 6-12M', color: 'Yellow', size: '6-12M', price: 429, stock: 8 },
          { label: 'Mint - 1Y', color: 'Mint', size: '1Y', price: 429, stock: 7 },
        ],
      },
      {
        title: 'Kids Canvas Sneakers with Velcro Closure',
        slug: 'kids-canvas-sneakers-velcro',
        description:
          'Durable canvas sneakers with Velcro closure. Easy on and off for active kids. Rubber sole provides excellent grip on all surfaces.',
        basePrice: 529,
        img: 'https://m.media-amazon.com/images/I/61oufcUycuL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - 24', color: 'White', size: '24', price: 529, stock: 8 },
          { label: 'Blue - 26', color: 'Blue', size: '26', price: 529, stock: 9 },
          { label: 'Pink - 27', color: 'Pink', size: '27', price: 529, stock: 7 },
          { label: 'Navy - 29', color: 'Navy', size: '29', price: 529, stock: 6 },
        ],
      },
      {
        title: 'Plush Animal Backpack for Toddlers – Waterproof Lining',
        slug: 'plush-animal-backpack-toddlers',
        description:
          'Adorable plush animal backpack for toddlers. Padded straps and waterproof lining to protect belongings. Perfect for nursery and outings.',
        basePrice: 379,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Bunny - Pink', color: 'Pink', price: 379, stock: 10 },
          { label: 'Bear - Brown', color: 'Brown', price: 379, stock: 9 },
          { label: 'Dino - Green', color: 'Green', price: 379, stock: 8 },
        ],
      },
      {
        title: 'Arabic Alphabet Wooden Puzzle Set – Educational',
        slug: 'arabic-alphabet-wooden-puzzle-set',
        description:
          'Set of 4 wooden puzzles featuring Arabic alphabet, numbers, shapes, and animals. Safe non-toxic paint. Develops fine motor skills and early literacy.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/71HqFGroRsL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Arabic Letters', color: 'Multi', price: 629, stock: 12 },
          { label: 'Numbers & Shapes', color: 'Multi', price: 629, stock: 10 },
        ],
      },
      {
        title: 'Kids School Backpack – Lightweight Waterproof',
        slug: 'kids-school-backpack-waterproof',
        description:
          'Lightweight waterproof school backpack with multiple compartments. Ergonomic padded straps and reflective strip for safety. Fits A4 binders.',
        basePrice: 399,
        img: 'https://m.media-amazon.com/images/I/61NU6Ti5R8L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue Dinosaur', color: 'Blue', price: 399, stock: 12 },
          { label: 'Pink Unicorn', color: 'Pink', price: 399, stock: 10 },
          { label: 'Red Superhero', color: 'Red', price: 399, stock: 9 },
        ],
      },
      {
        title: "Kids' Warm Fleece Jacket – Zip-Up Hoodie",
        slug: 'kids-warm-fleece-jacket',
        description:
          'Soft fleece zip-up hoodie for kids. Warm and cozy for cooler days. Two hand pockets and full zip closure in fun vibrant colors.',
        basePrice: 449,
        img: 'https://m.media-amazon.com/images/I/71FoOjGYiDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue - 4Y', color: 'Blue', size: '4Y', price: 449, stock: 8 },
          { label: 'Red - 6Y', color: 'Red', size: '6Y', price: 449, stock: 9 },
          { label: 'Pink - 8Y', color: 'Pink', size: '8Y', price: 449, stock: 7 },
        ],
      },
      {
        title: "Kids' Swim Shorts – Quick Dry UPF 50+",
        slug: 'kids-swim-shorts-quick-dry',
        description:
          'Quick-dry swim shorts with UPF 50+ sun protection. Elastic waistband with drawstring and mesh inner lining. Great for pool and beach.',
        basePrice: 259,
        img: 'https://m.media-amazon.com/images/I/61oufcUycuL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue Sharks - 4Y', color: 'Blue', size: '4Y', price: 259, stock: 10 },
          { label: 'Green Dino - 6Y', color: 'Green', size: '6Y', price: 259, stock: 9 },
          { label: 'Red Cars - 8Y', color: 'Red', size: '8Y', price: 259, stock: 8 },
        ],
      },
      {
        title: "Kids' Sports Tracksuit Set – Breathable Cotton",
        slug: 'kids-sports-tracksuit-set',
        description:
          '2-piece sports tracksuit (jacket + pants) in breathable cotton-poly blend. Ribbed cuffs and elastic waistband. Ideal for PE and active play.',
        basePrice: 549,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Navy - 4-5Y', color: 'Navy', size: '4-5Y', price: 549, stock: 8 },
          { label: 'Gray - 6-7Y', color: 'Gray', size: '6-7Y', price: 549, stock: 10 },
          { label: 'Black - 8-9Y', color: 'Black', size: '8-9Y', price: 549, stock: 7 },
        ],
      },
      {
        title: "Kids' Lunch Box Set with Water Bottle – BPA Free",
        slug: 'kids-lunch-box-set-bpa-free',
        description:
          'BPA-free lunch box set with matching 500ml water bottle. Leakproof compartmented box fits sandwiches, fruit, and snacks. Dishwasher safe.',
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/71FoOjGYiDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue Robot', color: 'Blue', price: 299, stock: 12 },
          { label: 'Pink Princess', color: 'Pink', price: 299, stock: 11 },
          { label: 'Green Space', color: 'Green', price: 299, stock: 9 },
        ],
      },
    ],
  },

  // ── 4. ELECTRONICS ────────────────────────────────────────────────────────
  {
    name: 'Electronics',
    slug: 'electronics',
    products: [
      {
        title: 'Bluetooth Speaker with RGB Lighting – 4" Wireless',
        slug: 'bluetooth-speaker-rgb-lighting',
        description:
          '4-inch wireless Bluetooth speaker with built-in RGB lighting and mobile phone holder stand. Rich 360° sound with deep bass. 8-hour battery life.',
        basePrice: 329,
        img: 'https://m.media-amazon.com/images/I/711CWohpoyL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black', color: 'Black', price: 329, stock: 20 },
          { label: 'White', color: 'White', price: 329, stock: 15 },
        ],
      },
      {
        title: 'ESSAGER 20W PD USB-C Fast Charger – GaN Wall Adapter',
        slug: 'essager-20w-pd-usbc-fast-charger',
        description:
          'Ultra-compact 20W Power Delivery USB-C wall charger. Charges iPhone 50% in 30 minutes. Universal voltage 100-240V for worldwide use.',
        basePrice: 385,
        img: 'https://m.media-amazon.com/images/I/519PSLA2BGL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 385, stock: 25 },
          { label: 'Black', color: 'Black', price: 385, stock: 20 },
        ],
      },
      {
        title: 'M10 TWS Wireless Earbuds – Bluetooth 5.1 with Charging Case',
        slug: 'm10-tws-wireless-earbuds-bt51',
        description:
          'True wireless earbuds with active noise isolation and Bluetooth 5.1. 6+24h battery with wireless charging case. IPX5 sweat resistance.',
        basePrice: 176,
        img: 'https://m.media-amazon.com/images/I/41btGX2zKxS._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 176, stock: 18 },
          { label: 'Black', color: 'Black', price: 176, stock: 22 },
        ],
      },
      {
        title: 'Soundbar Speaker – K2065 Wired Bluetooth 3.5mm',
        slug: 'k2065-soundbar-wired-bluetooth',
        description:
          'Slim soundbar with wired 3.5mm and Bluetooth input. 10W stereo output with subwoofer. LED volume indicator and remote control included.',
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/41YJcH9yAPL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Black', color: 'Black', price: 299, stock: 15 }],
      },
      {
        title: 'Adjustable Aluminium Laptop Stand – Portable Riser',
        slug: 'adjustable-aluminium-laptop-stand',
        description:
          'Lightweight aluminium laptop stand with 6 adjustable height angles. Improves posture and keeps laptop cool. Folds flat for travel.',
        basePrice: 129,
        img: 'https://m.media-amazon.com/images/I/61fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Silver', color: 'Silver', price: 129, stock: 20 },
          { label: 'Space Gray', color: 'Space Gray', price: 129, stock: 15 },
        ],
      },
      {
        title: 'USB-C to Lightning Multi-Adapter Charging Kit',
        slug: 'usbc-lightning-multi-adapter-kit',
        description:
          'Universal charging adapter kit with USB-C to Lightning converter plus multiple cable tips. Travel-friendly compact design for all devices.',
        basePrice: 88,
        img: 'https://m.media-amazon.com/images/I/613BV29Uu2L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Standard', color: 'White', price: 88, stock: 30 }],
      },
      {
        title: 'LCD Writing Tablet 8.5" – Electronic Drawing Pad',
        slug: 'lcd-writing-tablet-85-inch',
        description:
          '8.5-inch LCD writing and drawing tablet with one-button erase. No ink or paper needed. Perfect for notes, doodles, and kids learning to write.',
        basePrice: 78,
        img: 'https://m.media-amazon.com/images/I/61OemvX0anS._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue', color: 'Blue', price: 78, stock: 25 },
          { label: 'Pink', color: 'Pink', price: 78, stock: 20 },
          { label: 'Green', color: 'Green', price: 78, stock: 18 },
        ],
      },
      {
        title: 'Wireless Smart Watch – Heart Rate & Sleep Monitor',
        slug: 'wireless-smart-watch-health-monitor',
        description:
          'Feature-packed smartwatch with heart rate, blood oxygen, sleep tracking, and 100+ sport modes. 7-day battery, waterproof IP68. Compatible with iOS & Android.',
        basePrice: 1099,
        img: 'https://m.media-amazon.com/images/I/51keV3OO2kL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black', color: 'Black', price: 1099, stock: 10 },
          { label: 'Silver', color: 'Silver', price: 1099, stock: 8 },
          { label: 'Rose Gold', color: 'Rose Gold', price: 1149, stock: 6 },
        ],
      },
      {
        title: 'Retro Gramophone Bluetooth Speaker – USB & AUX',
        slug: 'retro-gramophone-bluetooth-speaker',
        description:
          'Vintage gramophone-style Bluetooth speaker that also plays USB and AUX sources. Rich warm sound with a vintage aesthetic. Great as a decorative gift.',
        basePrice: 1299,
        img: 'https://m.media-amazon.com/images/I/51N71G5e5sL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Antique Gold', color: 'Gold', price: 1299, stock: 8 },
          { label: 'Walnut Brown', color: 'Brown', price: 1299, stock: 6 },
        ],
      },
      {
        title: 'Power Bank 20000mAh – Dual USB + USB-C Fast Charge',
        slug: 'power-bank-20000mah-fast-charge',
        description:
          '20000mAh high-capacity power bank with 22.5W fast charging output. Dual USB-A and one USB-C port. Charges smartphones up to 4-5 times.',
        basePrice: 649,
        img: 'https://m.media-amazon.com/images/I/41btGX2zKxS._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 649, stock: 12 },
          { label: 'White', color: 'White', price: 649, stock: 10 },
        ],
      },
    ],
  },

  // ── 5. ENTERTAINMENT ──────────────────────────────────────────────────────
  {
    name: 'Entertainment',
    slug: 'entertainment',
    products: [
      {
        title: 'Transformer Robot Police Car Toy – 2-in-1 Remote Control',
        slug: 'transformer-robot-police-car-2in1',
        description:
          '2-in-1 transformer toy that converts from a police car to a robot. Remote control with 360° stunt mode and LED lights. Ideal for ages 6+.',
        basePrice: 120,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black', color: 'Black', price: 120, stock: 15 },
          { label: 'Blue', color: 'Blue', price: 120, stock: 12 },
        ],
      },
      {
        title: 'Magnetic Chess Board Game – Family Strategy Game',
        slug: 'magnetic-chess-board-family-game',
        description:
          'Classic magnetic chess board with 20 weighted pieces. Folding board doubles as storage. Great for all ages to learn strategy and critical thinking.',
        basePrice: 132,
        img: 'https://m.media-amazon.com/images/I/71HqFGroRsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Standard Set', color: 'Multi', price: 132, stock: 20 }],
      },
      {
        title: 'Crocodile Dentist Bite Finger Game – Family Fun',
        slug: 'crocodile-dentist-bite-finger-game',
        description:
          'Classic crocodile dentist finger game. Press the teeth one at a time — the croc snaps down on one unlucky finger! Fast-paced fun for the whole family.',
        basePrice: 105,
        img: 'https://m.media-amazon.com/images/I/61W3yu9wAcL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Green Croc', color: 'Green', price: 105, stock: 25 }],
      },
      {
        title: 'Retro Handheld Game Console – 500 Built-In Games',
        slug: 'retro-handheld-game-console-500-games',
        description:
          'Loaded with 500 classic 8-bit retro games. 3.0-inch HD screen with rechargeable lithium battery. 4-hour playtime on a single charge.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Retro Red', color: 'Red', price: 629, stock: 15 },
          { label: 'Matte Black', color: 'Black', price: 629, stock: 12 },
        ],
      },
      {
        title: 'Jigsaw Puzzle 1000 Pieces – Egyptian Landmarks',
        slug: 'jigsaw-puzzle-1000-egyptian-landmarks',
        description:
          '1000-piece jigsaw puzzle featuring iconic Egyptian landmarks (Pyramids, Sphinx, Nile). High-quality thick cardboard pieces. Finished size 70×50cm.',
        basePrice: 249,
        img: 'https://m.media-amazon.com/images/I/71HqFGroRsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Egyptian Landmarks', color: 'Multi', price: 249, stock: 15 },
          { label: 'World Map', color: 'Multi', price: 249, stock: 12 },
        ],
      },
      {
        title: 'UNO Card Game – Classic Family Card Game',
        slug: 'uno-card-game-classic-family',
        description:
          'The classic UNO card game with 108 cards. Action cards include Draw Two, Skip, Reverse, and the dreaded Wild Draw Four. 2–10 players.',
        basePrice: 189,
        img: 'https://m.media-amazon.com/images/I/61W3yu9wAcL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Standard Edition', color: 'Multi', price: 189, stock: 30 }],
      },
      {
        title: 'Wireless Gaming Controller – PC & Android Compatible',
        slug: 'wireless-gaming-controller-pc-android',
        description:
          'Wireless gaming controller compatible with PC, Android smartphones, and tablets. Dual vibration feedback, ergonomic grip, 10-hour battery life.',
        basePrice: 579,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 579, stock: 10 },
          { label: 'White', color: 'White', price: 579, stock: 8 },
        ],
      },
      {
        title: 'Shark Concert Musical Light-Up Toy – Blowing Ball',
        slug: 'shark-concert-musical-lightup-toy',
        description:
          'Funny shark toy that blows lightweight balls while playing music and flashing colorful lights. Encourages motor skills and creativity. Ages 1-4.',
        basePrice: 420,
        img: 'https://m.media-amazon.com/images/I/61NU6Ti5R8L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue Shark', color: 'Blue', price: 420, stock: 15 },
          { label: 'Pink Shark', color: 'Pink', price: 420, stock: 12 },
        ],
      },
      {
        title: 'Monopoly Classic Board Game – Arabic/English Edition',
        slug: 'monopoly-classic-board-game-arabic',
        description:
          'The iconic Monopoly board game in a special Arabic/English bilingual edition featuring Egyptian cities. Buy, sell, and trade your way to victory.',
        basePrice: 549,
        img: 'https://m.media-amazon.com/images/I/71HqFGroRsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Arabic/English Edition', color: 'Multi', price: 549, stock: 15 }],
      },
      {
        title: 'Bluetooth Mini Speaker – Portable Waterproof IPX5',
        slug: 'bluetooth-mini-speaker-portable-ipx5',
        description:
          'Compact Bluetooth speaker with IPX5 water resistance. 360° surround sound, 12-hour battery, built-in microphone for hands-free calls.',
        basePrice: 399,
        img: 'https://m.media-amazon.com/images/I/711CWohpoyL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 399, stock: 12 },
          { label: 'Blue', color: 'Blue', price: 399, stock: 10 },
          { label: 'Red', color: 'Red', price: 399, stock: 9 },
        ],
      },
    ],
  },

  // ── 6. HOME ───────────────────────────────────────────────────────────────
  {
    name: 'Home',
    slug: 'home',
    products: [
      {
        title: 'Forbed Cloud Velvet Quilt Set – 2 Piece Single',
        slug: 'forbed-cloud-velvet-quilt-set-single',
        description:
          'Luxuriously soft Cloud Velvet 2-piece quilt set (duvet cover + pillowcase). 200 thread count microfiber fill. Machine washable and wrinkle-resistant.',
        basePrice: 2033,
        img: 'https://m.media-amazon.com/images/I/81fWqSnaroL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Cloud Grey', color: 'Cloud Grey', price: 2033, stock: 8 },
          { label: 'Dusty Pink', color: 'Dusty Pink', price: 2033, stock: 7 },
          { label: 'Navy Blue', color: 'Navy', price: 2033, stock: 6 },
        ],
      },
      {
        title: 'Round Glass-Top Coffee Table – Gold Stainless Frame 70cm',
        slug: 'round-glass-top-coffee-table-gold-70cm',
        description:
          'Modern round coffee table with tempered glass top and gold PVD stainless steel frame. 70cm diameter. A sleek centerpiece for any living room.',
        basePrice: 4930,
        img: 'https://m.media-amazon.com/images/I/717sIvFOX-L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Gold Frame / Clear Glass', color: 'Gold', price: 4930, stock: 5 },
          { label: 'Gold Frame / Black Glass', color: 'Black', price: 4930, stock: 4 },
        ],
      },
      {
        title: 'Soy Wax Scented Candle Set – 3 Signature Scents',
        slug: 'soy-wax-scented-candle-set-3pc',
        description:
          'Set of 3 hand-poured soy wax candles with cotton wicks. 40-hour burn time each. Egyptian rose, jasmine musk, and oud amber scents.',
        basePrice: 429,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Oud & Rose', color: 'Rose', price: 429, stock: 12 },
          { label: 'Jasmine & Musk', color: 'Jasmine', price: 429, stock: 10 },
          { label: 'Lavender & Vanilla', color: 'Lavender', price: 429, stock: 9 },
        ],
      },
      {
        title: 'Handmade Ceramic Vase – Artisan Reactive Glaze',
        slug: 'handmade-ceramic-vase-reactive-glaze',
        description:
          'Artisan-crafted ceramic vase with reactive glaze finish. Each piece is unique with natural color variations. Perfect for dried flowers and modern décor.',
        basePrice: 679,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Ivory White', color: 'Ivory', price: 679, stock: 7 },
          { label: 'Sage Green', color: 'Sage', price: 679, stock: 6 },
          { label: 'Midnight Blue', color: 'Midnight Blue', price: 729, stock: 5 },
        ],
      },
      {
        title: 'LED Strip Lights 5m – Smart RGB with Remote',
        slug: 'led-strip-lights-5m-smart-rgb',
        description:
          '5-meter smart RGB LED strip lights with remote control. 16 million colors, music sync mode, and timer function. Self-adhesive backing for easy installation.',
        basePrice: 349,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '5 Meters', size: '5m', price: 349, stock: 20 },
          { label: '10 Meters', size: '10m', price: 599, stock: 15 },
        ],
      },
      {
        title: '9-Tier Shoe Rack Organizer – Portable with Fabric Cover',
        slug: '9tier-shoe-rack-organizer-fabric',
        description:
          '9-tier portable shoe rack with nonwoven fabric cover. Holds up to 36 pairs. Easy assembly with no tools required. Protects shoes from dust.',
        basePrice: 452,
        img: 'https://m.media-amazon.com/images/I/71a9tEszBCL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Beige', color: 'Beige', price: 452, stock: 10 },
          { label: 'Black', color: 'Black', price: 452, stock: 9 },
        ],
      },
      {
        title: 'Plastic Rattan Outdoor Chair Set – Round Table & 2 Chairs',
        slug: 'plastic-rattan-outdoor-chair-set',
        description:
          '3-piece outdoor garden set with a round rattan-look table and 2 matching chairs. Weather-resistant plastic construction for year-round use.',
        basePrice: 1129,
        img: 'https://m.media-amazon.com/images/I/51AQM8k1SNL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 1129, stock: 6 },
          { label: 'White', color: 'White', price: 1129, stock: 5 },
        ],
      },
      {
        title: 'Acacia Wood Serving & Charcuterie Board',
        slug: 'acacia-wood-serving-charcuterie-board',
        description:
          'Premium acacia wood cheese and charcuterie board with juice groove. Food-safe mineral oil finish. Perfect for entertaining and gifting.',
        basePrice: 579,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Small (30cm)', size: 'Small', price: 579, stock: 10 },
          { label: 'Large (45cm)', size: 'Large', price: 779, stock: 7 },
        ],
      },
      {
        title: '3-Shelf Low Bookcase – White Wood Display Unit',
        slug: '3shelf-low-bookcase-white-wood',
        description:
          'Classic 3-tier low bookcase in white wood-finish. Sturdy MDF construction with adjustable shelf height. Ideal for books, plants, and decorative items.',
        basePrice: 703,
        img: 'https://m.media-amazon.com/images/I/61vsfFIUN5L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 703, stock: 8 },
          { label: 'Oak', color: 'Oak', price: 703, stock: 6 },
        ],
      },
      {
        title: 'Luxury Throw Pillow Set – Velvet 2 Pieces',
        slug: 'luxury-throw-pillow-set-velvet',
        description:
          'Handcrafted decorative throw pillows in premium velvet with hidden zipper. Includes insert. Available in 4 rich tones to elevate any living space.',
        basePrice: 479,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Dusty Blue', color: 'Dusty Blue', price: 479, stock: 10 },
          { label: 'Terracotta', color: 'Terracotta', price: 479, stock: 8 },
          { label: 'Forest Green', color: 'Forest Green', price: 479, stock: 7 },
          { label: 'Warm Gray', color: 'Warm Gray', price: 479, stock: 9 },
        ],
      },
    ],
  },

  // ── 7. BEAUTY ─────────────────────────────────────────────────────────────
  {
    name: 'Beauty',
    slug: 'beauty',
    products: [
      {
        title: 'JOY Soap Magical Touch Bundle – 4 × 110g',
        slug: 'joy-soap-magical-touch-bundle-4pack',
        description:
          'Pack of 4 JOY Magical Touch soap bars at 110g each. Enriched with skin-brightening ingredients for a smooth, radiant complexion. Gentle daily cleanser.',
        basePrice: 84,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71qy2cd4gdL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [{ label: 'Pack of 4', size: '4×110g', price: 84, stock: 30 }],
      },
      {
        title: 'Garnier SkinActive Micellar Cleansing Water – 400ml',
        slug: 'garnier-micellar-cleansing-water-400ml',
        description:
          'No-rinse micellar water that gently removes makeup, impurities, and excess oil in one swipe. Suitable for all skin types including sensitive skin.',
        basePrice: 110,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/51G1d+VuaIL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: '100ml', size: '100ml', price: 80, stock: 20 },
          { label: '400ml', size: '400ml', price: 180, stock: 15 },
        ],
      },
      {
        title: 'NIVEA MEN Deep Black Carbon Antiperspirant Roll-On',
        slug: 'nivea-men-deep-black-carbon-roll-on',
        description:
          'NIVEA MEN antiperspirant roll-on with black carbon. Provides 48-hour protection against sweat and odor with a clean, fresh scent.',
        basePrice: 99,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71YD+C0zhHL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [{ label: '50ml', size: '50ml', price: 99, stock: 25 }],
      },
      {
        title: "VGR V-071 Men's Electric Shaver – Rechargeable",
        slug: 'vgr-v071-mens-electric-shaver',
        description:
          'Cordless electric shaver with 3-blade floating head for a close, comfortable shave. USB rechargeable, waterproof design for wet and dry use.',
        basePrice: 361,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/61Rl6XVemdL._AC_UL600_SR600,400_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Silver', color: 'Silver', price: 361, stock: 12 },
          { label: 'Black', color: 'Black', price: 361, stock: 10 },
        ],
      },
      {
        title: 'Vitamin C Brightening Face Serum – 20% Concentration',
        slug: 'vitamin-c-brightening-face-serum-20pct',
        description:
          '20% Vitamin C serum with hyaluronic acid and niacinamide. Visibly reduces dark spots and uneven skin tone in 4 weeks. Lightweight and fast-absorbing.',
        basePrice: 629,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71AVg4o2PHL._AC_UL600_SR600,400_.jpg',
        isFeatured: true,
        variants: [
          { label: '30ml', size: '30ml', price: 629, stock: 15 },
          { label: '50ml', size: '50ml', price: 929, stock: 10 },
        ],
      },
      {
        title: 'NIVEA MEN Silver Protect Antibacterial Deodorant Spray',
        slug: 'nivea-men-silver-protect-spray-150ml',
        description:
          'NIVEA MEN antibacterial deodorant spray with silver ion technology. 48-hour protection, gentle on skin, alcohol-free formula.',
        basePrice: 149,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71AVg4o2PHL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [{ label: '150ml', size: '150ml', price: 149, stock: 20 }],
      },
      {
        title: 'Egyptian Rose Water Toner – Pure Distilled 200ml',
        slug: 'egyptian-rose-water-toner-pure',
        description:
          'Pure distilled rose water from Egyptian valleys. Hydrates, tones, and refreshes skin. Natural balancing properties reduce redness and pores.',
        basePrice: 329,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/61SRoM-MhWL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: '200ml', size: '200ml', price: 329, stock: 18 },
          { label: '400ml', size: '400ml', price: 529, stock: 12 },
        ],
      },
      {
        title: 'Argan Oil Deep Conditioning Hair Mask',
        slug: 'argan-oil-deep-conditioning-hair-mask',
        description:
          'Deep-conditioning hair mask with Moroccan argan oil. Repairs damage, adds shine, and reduces frizz. For all hair types including color-treated hair.',
        basePrice: 479,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/61MuPSURIjL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: '250ml', size: '250ml', price: 479, stock: 12 },
          { label: '500ml', size: '500ml', price: 729, stock: 8 },
        ],
      },
      {
        title: 'Natural Lip Balm Set with SPF 15 – Pack of 3',
        slug: 'natural-lip-balm-spf15-set-3pack',
        description:
          'Set of 3 natural lip balms with SPF 15 protection. Shea butter and beeswax formula keeps lips soft and moisturized. Available in 3 scents.',
        basePrice: 279,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71yXiUz49XL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [{ label: 'Cherry / Mint / Honey', color: 'Multi', price: 279, stock: 20 }],
      },
      {
        title: 'Kaolin Clay Deep Cleansing Face Mask',
        slug: 'kaolin-clay-deep-cleansing-face-mask',
        description:
          'Deep-cleansing kaolin clay mask. Unclogs pores, controls oil, and brightens complexion. Suitable for combination and oily skin types.',
        basePrice: 379,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/41FbI-XcfBL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: '100g', size: '100g', price: 379, stock: 14 },
          { label: '250g', size: '250g', price: 629, stock: 9 },
        ],
      },
    ],
  },

  // ── 8. SPORTS ─────────────────────────────────────────────────────────────
  {
    name: 'Sports',
    slug: 'sports',
    products: [
      {
        title: 'Exercise Resistance Bands Set – 5 Levels',
        slug: 'exercise-resistance-bands-set-5levels',
        description:
          'Set of 5 latex resistance bands from light to heavy resistance. Ideal for strength training, yoga, and physiotherapy. Includes carrying bag.',
        basePrice: 139,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71Tb8PjBR2L._AC_UL600_SR600,400_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Standard Set', color: 'Multi', price: 139, stock: 20 },
          { label: 'Heavy Set', color: 'Black', price: 199, stock: 15 },
        ],
      },
      {
        title: 'Tank Tritan Sports Water Bottle – 800ml BPA Free',
        slug: 'tank-tritan-sports-water-bottle-800ml',
        description:
          'BPA-free Tritan plastic sports bottle with a twist cap. 800ml capacity, leakproof design, and a wide mouth for ice cubes. Dishwasher safe.',
        basePrice: 185,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/41dHldkW+yL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 185, stock: 20 },
          { label: 'Blue', color: 'Blue', price: 185, stock: 18 },
          { label: 'Purple', color: 'Purple', price: 185, stock: 15 },
        ],
      },
      {
        title: 'SportQ Premium Speed Skipping Rope – Tangle-Free',
        slug: 'sportq-premium-speed-skipping-rope',
        description:
          'Tangle-free speed skipping rope with ball-bearing handles. Adjustable cable length for all heights. Perfect for CrossFit, boxing, and cardio training.',
        basePrice: 123,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/61Ujmv8jdHL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 123, stock: 22 },
          { label: 'Red', color: 'Red', price: 123, stock: 16 },
          { label: 'Blue', color: 'Blue', price: 123, stock: 14 },
        ],
      },
      {
        title: 'Premium Yoga Mat – 6mm TPE Non-Slip with Alignment Lines',
        slug: 'premium-yoga-mat-6mm-tpe-alignment',
        description:
          '6mm thick TPE yoga mat with non-slip surface and alignment guide lines. Eco-friendly and latex-free. Includes carry strap for easy transport.',
        basePrice: 729,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/719V0dyo9HL._AC_UL600_SR600,400_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Purple', color: 'Purple', price: 729, stock: 10 },
          { label: 'Teal Blue', color: 'Teal', price: 729, stock: 8 },
          { label: 'Coral Pink', color: 'Coral', price: 729, stock: 7 },
          { label: 'Charcoal', color: 'Charcoal', price: 729, stock: 9 },
        ],
      },
      {
        title: 'Portal Durable Sports Bottle with Time Indicator – 32oz',
        slug: 'portal-sports-bottle-time-indicator-32oz',
        description:
          '32oz (950ml) motivational sports bottle with hourly time markers to track daily hydration. Wide mouth lid, leakproof, and BPA-free Tritan plastic.',
        basePrice: 156,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/719V0dyo9HL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Pink', color: 'Pink', price: 156, stock: 15 },
          { label: 'Blue', color: 'Blue', price: 156, stock: 14 },
          { label: 'Black', color: 'Black', price: 156, stock: 12 },
        ],
      },
      {
        title: 'Adjustable Neoprene Ankle & Wrist Weights – 2kg Pair',
        slug: 'adjustable-neoprene-ankle-wrist-weights-2kg',
        description:
          'Pair of 1kg adjustable neoprene wrist/ankle weights (2kg total). Velcro fastening for secure fit during walking, aerobics, and strength training.',
        basePrice: 349,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71Tb8PjBR2L._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - 0.5kg pair', color: 'Black', price: 279, stock: 15 },
          { label: 'Pink - 1kg pair', color: 'Pink', price: 349, stock: 12 },
          { label: 'Blue - 2kg pair', color: 'Blue', price: 449, stock: 10 },
        ],
      },
      {
        title: 'Gym Lifting Gloves – Half Finger with Wrist Support',
        slug: 'gym-lifting-gloves-half-finger',
        description:
          'Half-finger gym gloves with integrated wrist support strap. Anti-slip palm padding for secure grip during weightlifting and pull-ups.',
        basePrice: 379,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/61Ujmv8jdHL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - S/M', color: 'Black', size: 'S/M', price: 379, stock: 12 },
          { label: 'Black - L/XL', color: 'Black', size: 'L/XL', price: 379, stock: 10 },
          { label: 'Blue - S/M', color: 'Blue', size: 'S/M', price: 379, stock: 8 },
        ],
      },
      {
        title: 'Tank Insulated Plastic Sports Bottle – 650ml',
        slug: 'tank-insulated-plastic-sports-bottle-650ml',
        description:
          'Insulated 650ml sports bottle keeps drinks cold for 12 hours. BPA-free and leakproof flip-top lid. Ergonomic grip for one-handed use during training.',
        basePrice: 189,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/418jNIjf2+L._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Purple', color: 'Purple', price: 189, stock: 16 },
          { label: 'Red', color: 'Red', price: 189, stock: 14 },
          { label: 'Black', color: 'Black', price: 189, stock: 18 },
        ],
      },
      {
        title: 'Foam Roller – High Density for Muscle Recovery',
        slug: 'foam-roller-high-density-muscle-recovery',
        description:
          'High-density EVA foam roller (60cm) for deep tissue massage and myofascial release. Relieves sore muscles post-workout and improves flexibility.',
        basePrice: 299,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71Tb8PjBR2L._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - 30cm', color: 'Black', size: '30cm', price: 229, stock: 12 },
          { label: 'Blue - 60cm', color: 'Blue', size: '60cm', price: 299, stock: 10 },
        ],
      },
      {
        title: 'Adjustable Push-Up Bars – Non-Slip Ergonomic Handles',
        slug: 'adjustable-push-up-bars-non-slip',
        description:
          'Pair of push-up bars with non-slip rubber base and ergonomic foam handles. Reduces wrist strain and increases range of motion for deeper push-ups.',
        basePrice: 249,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/71Tb8PjBR2L._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 249, stock: 18 },
          { label: 'Blue', color: 'Blue', price: 249, stock: 15 },
        ],
      },
    ],
  },

  // ── 9. FOOTWEAR ───────────────────────────────────────────────────────────
  {
    name: 'Footwear',
    slug: 'footwear',
    products: [
      {
        title: "Testa Toro S5 Men's Breathable Everyday Sneaker",
        slug: 'testa-toro-s5-mens-breathable-sneaker',
        description:
          'Cushioned and lightweight everyday sneaker from Testa Toro. Breathable mesh upper and foam insole for all-day comfort during walking and casual use.',
        basePrice: 379,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'White - 40', color: 'White', size: '40', price: 379, stock: 8 },
          { label: 'White - 42', color: 'White', size: '42', price: 379, stock: 9 },
          { label: 'Black - 41', color: 'Black', size: '41', price: 379, stock: 7 },
          { label: 'Navy - 43', color: 'Navy', size: '43', price: 379, stock: 6 },
        ],
      },
      {
        title: "Testa Toro M4 Men's Classic Leather Sneaker",
        slug: 'testa-toro-m4-classic-leather-sneaker',
        description:
          'Stylish everyday casual sneaker in smooth leather upper. Cushioned insole and durable rubber sole. Smart-casual look for any occasion.',
        basePrice: 389,
        img: 'https://m.media-amazon.com/images/I/51-D4R1tnOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - 40', color: 'White', size: '40', price: 389, stock: 7 },
          { label: 'Black - 42', color: 'Black', size: '42', price: 389, stock: 8 },
          { label: 'Tan - 41', color: 'Tan', size: '41', price: 389, stock: 6 },
        ],
      },
      {
        title: "Women's Basic Sneaker – Lightweight Casual",
        slug: 'womens-basic-casual-sneaker',
        description:
          'Lightweight casual sneaker designed for comfort during everyday walking. Flexible rubber sole and padded collar. Available in multiple colors.',
        basePrice: 330,
        img: 'https://m.media-amazon.com/images/I/618jgxjiJuL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - 37', color: 'White', size: '37', price: 330, stock: 10 },
          { label: 'Pink - 38', color: 'Pink', size: '38', price: 330, stock: 9 },
          { label: 'Black - 39', color: 'Black', size: '39', price: 330, stock: 8 },
          { label: 'White - 40', color: 'White', size: '40', price: 330, stock: 7 },
        ],
      },
      {
        title: "Men's ACTIV Fashion Street Shoes – Casual Trainer",
        slug: 'mens-activ-fashion-street-shoes',
        description:
          'Versatile street-style sneaker trainer with cushioned midsole and textured rubber outsole. Suitable for gym, casual outings, and daily errands.',
        basePrice: 749,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White/Blue - 40', color: 'White', size: '40', price: 749, stock: 8 },
          { label: 'Black/Red - 42', color: 'Black', size: '42', price: 749, stock: 7 },
          { label: 'Gray/Orange - 44', color: 'Gray', size: '44', price: 749, stock: 5 },
        ],
      },
      {
        title: "Women's Ultra-Soft Running Sneaker – Lightweight Mesh",
        slug: 'womens-ultrasoft-running-sneaker-mesh',
        description:
          "Ultra-soft and lightweight women's running shoe with breathable knit upper. Responsive foam cushioning for a comfortable ride on all surfaces.",
        basePrice: 680,
        img: 'https://m.media-amazon.com/images/I/81JX8lAOB4L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'White/Pink - 37', color: 'White', size: '37', price: 680, stock: 8 },
          { label: 'Blue/White - 38', color: 'Blue', size: '38', price: 680, stock: 9 },
          { label: 'Black - 39', color: 'Black', size: '39', price: 680, stock: 7 },
          { label: 'Gray/Purple - 40', color: 'Gray', size: '40', price: 680, stock: 6 },
        ],
      },
      {
        title: 'Unisex Lightweight Breathable Sneaker – Sizes 38–42',
        slug: 'unisex-lightweight-breathable-sneaker',
        description:
          'Unisex casual sneaker in breathable mesh fabric. Ideal for everyday walking and light sports. Available in sizes 38 to 42.',
        basePrice: 250,
        img: 'https://m.media-amazon.com/images/I/61XKtfXLf+L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - 38', color: 'White', size: '38', price: 250, stock: 10 },
          { label: 'Black - 40', color: 'Black', size: '40', price: 250, stock: 12 },
          { label: 'Gray - 42', color: 'Gray', size: '42', price: 250, stock: 8 },
        ],
      },
      {
        title: 'Strappy Flat Leather Sandals – Adjustable Ankle Strap',
        slug: 'strappy-flat-leather-sandals-ankle-strap',
        description:
          'Genuine leather flat sandals with adjustable ankle strap. Padded footbed and flexible rubber sole. Perfect for warm weather and beach outings.',
        basePrice: 729,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Tan - 37', color: 'Tan', size: '37', price: 729, stock: 7 },
          { label: 'Black - 38', color: 'Black', size: '38', price: 729, stock: 9 },
          { label: 'White - 39', color: 'White', size: '39', price: 729, stock: 6 },
        ],
      },
      {
        title: "Men's Casual Big Size Sneakers – Sizes 46–48",
        slug: 'mens-casual-big-size-sneakers-46-48',
        description:
          'Casual sneakers specially designed for larger foot sizes (46, 47, 48). Wide toe box and extra cushioning for comfort throughout the day.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/71OQbXn0BiL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - 46', color: 'Black', size: '46', price: 629, stock: 6 },
          { label: 'White - 47', color: 'White', size: '47', price: 629, stock: 5 },
          { label: 'Navy - 48', color: 'Navy', size: '48', price: 629, stock: 4 },
        ],
      },
      {
        title: 'Wide Fit Adjustable Comfort Shoes – Hook & Loop Strap',
        slug: 'wide-fit-adjustable-comfort-shoes',
        description:
          'Extra-wide comfort shoes with an adjustable hook-and-loop strap closure. Orthopaedic insole and non-slip sole. Ideal for elderly and wide feet.',
        basePrice: 855,
        img: 'https://m.media-amazon.com/images/I/51fFS8NgOCL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black - 40', color: 'Black', size: '40', price: 855, stock: 5 },
          { label: 'Black - 42', color: 'Black', size: '42', price: 855, stock: 4 },
          { label: 'Black - 44', color: 'Black', size: '44', price: 855, stock: 3 },
        ],
      },
      {
        title: "Men's Classic Suede Loafers – Smart Casual Elegance",
        slug: 'mens-classic-suede-loafers',
        description:
          'Premium suede penny loafers with leather sole. Low-profile heel and cushioned insole. Smart-casual elegance for office and evening wear.',
        basePrice: 1129,
        img: 'https://m.media-amazon.com/images/I/51B49qgxoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Brown - 40', color: 'Brown', size: '40', price: 1129, stock: 6 },
          { label: 'Brown - 42', color: 'Brown', size: '42', price: 1129, stock: 8 },
          { label: 'Black - 41', color: 'Black', size: '41', price: 1129, stock: 5 },
        ],
      },
    ],
  },

  // ── 10. ACCESSORIES ───────────────────────────────────────────────────────
  {
    name: 'Accessories',
    slug: 'accessories',
    products: [
      {
        title: 'Full-Grain Leather Tote Bag – Large Capacity',
        slug: 'full-grain-leather-tote-bag-large',
        description:
          'Spacious full-grain leather tote bag with interior organizer pockets and zipper closure. Fits a 13" laptop. A true investment piece that ages beautifully.',
        basePrice: 1829,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Cognac Brown', color: 'Cognac', price: 1829, stock: 6 },
          { label: 'Jet Black', color: 'Black', price: 1829, stock: 8 },
          { label: 'Camel', color: 'Camel', price: 1929, stock: 4 },
        ],
      },
      {
        title: 'Polarized Aviator Sunglasses – UV400 Metal Frame',
        slug: 'polarized-aviator-sunglasses-uv400',
        description:
          'UV400 polarized lenses with a lightweight metal frame. Timeless aviator style for superior sun protection. Includes hard case and cleaning cloth.',
        basePrice: 579,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Gold/Brown Lens', color: 'Gold', price: 579, stock: 10 },
          { label: 'Silver/Gray Lens', color: 'Silver', price: 579, stock: 9 },
          { label: 'Black/Green Lens', color: 'Black', price: 629, stock: 7 },
        ],
      },
      {
        title: 'Slim RFID-Blocking Leather Bi-Fold Wallet',
        slug: 'slim-rfid-blocking-leather-bifold-wallet',
        description:
          'RFID-blocking genuine leather wallet with 6 card slots, 2 note compartments, and a slim profile that fits any pocket comfortably.',
        basePrice: 579,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Dark Brown', color: 'Brown', price: 579, stock: 12 },
          { label: 'Black', color: 'Black', price: 579, stock: 14 },
          { label: 'Tan', color: 'Tan', price: 579, stock: 8 },
        ],
      },
      {
        title: 'Canvas Weekender Backpack – 25L with Laptop Sleeve',
        slug: 'canvas-weekender-backpack-25l',
        description:
          '25-liter waxed canvas backpack with leather accents. Laptop sleeve fits up to 15". Multiple pockets and a sturdy top handle for versatile carry.',
        basePrice: 929,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 929, stock: 10 },
          { label: 'Navy', color: 'Navy', price: 929, stock: 8 },
          { label: 'Olive', color: 'Olive', price: 979, stock: 6 },
        ],
      },
      {
        title: 'Car Trunk Organizer 48L – Heavy Duty Oxford Fabric',
        slug: 'car-trunk-organizer-48l-oxford',
        description:
          'Heavy-duty 48L boot organizer in waterproof Oxford fabric. Multiple compartments and removable dividers. Non-slip base keeps it in place while driving.',
        basePrice: 454,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 454, stock: 12 },
          { label: 'Gray', color: 'Gray', price: 454, stock: 10 },
        ],
      },
      {
        title: '100% Mulberry Silk Printed Scarf – Versatile Wrap',
        slug: '100pct-mulberry-silk-printed-scarf',
        description:
          '100% mulberry silk scarf with geometric print. Lightweight and breathable. Use as a neck scarf, head wrap, bag accessory, or beach cover-up.',
        basePrice: 729,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Sapphire Blue', color: 'Blue', price: 729, stock: 8 },
          { label: 'Blush Pink', color: 'Pink', price: 729, stock: 9 },
          { label: 'Crimson Red', color: 'Red', price: 729, stock: 6 },
        ],
      },
      {
        title: "Women's Genuine Leather Crossbody Bag – Compact",
        slug: 'womens-genuine-leather-crossbody-bag',
        description:
          'Compact genuine leather crossbody bag with adjustable shoulder strap. Magnetic snap closure, inner zip pocket, and card slots. Day-to-night versatility.',
        basePrice: 1299,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 1299, stock: 8 },
          { label: 'Tan', color: 'Tan', price: 1299, stock: 7 },
          { label: 'Burgundy', color: 'Burgundy', price: 1299, stock: 5 },
        ],
      },
      {
        title: "Men's Leather Dress Watch – Minimalist Quartz",
        slug: 'mens-leather-dress-watch-minimalist',
        description:
          'Slim minimalist quartz dress watch with genuine leather strap. Water-resistant to 30m. A timeless accessory for formal and smart-casual occasions.',
        basePrice: 899,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black Dial / Brown Strap', color: 'Brown', price: 899, stock: 8 },
          { label: 'White Dial / Black Strap', color: 'Black', price: 899, stock: 7 },
          { label: 'Silver Dial / Tan Strap', color: 'Silver', price: 949, stock: 5 },
        ],
      },
      {
        title: 'Woven Straw Beach Tote Bag – Oversized Summer Bag',
        slug: 'woven-straw-beach-tote-bag-oversized',
        description:
          'Handwoven straw beach tote with cotton canvas lining and magnetic closure. Large enough for towels, sunscreen, and a book. Interior zip pocket.',
        basePrice: 549,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Natural / White', color: 'Natural', price: 549, stock: 10 },
          { label: 'Natural / Black', color: 'Black', price: 549, stock: 9 },
        ],
      },
      {
        title: 'Snapback Baseball Cap – Adjustable Unisex',
        slug: 'snapback-baseball-cap-adjustable-unisex',
        description:
          'Classic structured snapback baseball cap with an embroidered logo. One size fits all with adjustable snap closure. UV-protective fabric.',
        basePrice: 229,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 229, stock: 20 },
          { label: 'Navy', color: 'Navy', price: 229, stock: 18 },
          { label: 'White', color: 'White', price: 229, stock: 15 },
        ],
      },
    ],
  },

  // ── 11. JEWELRY ───────────────────────────────────────────────────────────
  {
    name: 'Jewelry',
    slug: 'jewelry',
    products: [
      {
        title: 'Sterling Silver Cable Chain Necklace – 925 Silver 45cm',
        slug: 'sterling-silver-cable-chain-necklace-925',
        description:
          '925 sterling silver 45cm cable chain necklace. Stamped 925 for authenticity. Timeless everyday necklace that pairs with any pendant.',
        basePrice: 1029,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Silver - 40cm', color: 'Silver', size: '40cm', price: 1029, stock: 10 },
          { label: 'Silver - 45cm', color: 'Silver', size: '45cm', price: 1029, stock: 12 },
          { label: '18k Gold Plated - 45cm', color: 'Gold', size: '45cm', price: 1329, stock: 8 },
        ],
      },
      {
        title: '14k Gold-Filled Hoop Earrings – Three Sizes',
        slug: '14k-gold-filled-hoop-earrings-3-sizes',
        description:
          '14k gold-filled hoop earrings in three sizes. Lightweight and hypoallergenic. Tarnish-resistant and safe for sensitive ears.',
        basePrice: 829,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Gold - Small (20mm)', color: 'Gold', size: '20mm', price: 829, stock: 12 },
          { label: 'Gold - Medium (30mm)', color: 'Gold', size: '30mm', price: 929, stock: 10 },
          { label: 'Silver - Small (20mm)', color: 'Silver', size: '20mm', price: 829, stock: 9 },
          { label: 'Rose Gold - Medium', color: 'Rose Gold', size: '30mm', price: 979, stock: 7 },
        ],
      },
      {
        title: 'Handmade Glass Bead Friendship Bracelet',
        slug: 'handmade-glass-bead-friendship-bracelet',
        description:
          'Handmade glass bead bracelet with adjustable cord. Bohemian style meets Egyptian craft. Great as a gift or personal accessory.',
        basePrice: 379,
        img: 'https://m.media-amazon.com/images/I/61q3CndwJUL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Turquoise Blue', color: 'Turquoise', price: 379, stock: 15 },
          { label: 'Pearl White', color: 'White', price: 379, stock: 12 },
          { label: 'Multicolor', color: 'Multi', price: 379, stock: 10 },
        ],
      },
      {
        title: 'Adjustable Geometric Statement Ring – Gold & Silver',
        slug: 'adjustable-geometric-statement-ring',
        description:
          'Bold geometric statement ring in sterling silver or gold-plated brass. Open-back adjustable design fits sizes 6–9. Eye-catching and minimalist.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Silver', color: 'Silver', price: 629, stock: 10 },
          { label: 'Gold', color: 'Gold', price: 729, stock: 9 },
          { label: 'Rose Gold', color: 'Rose Gold', price: 729, stock: 7 },
        ],
      },
      {
        title: 'Crystal Stud Earrings Set – 6 Pairs',
        slug: 'crystal-stud-earrings-set-6pairs',
        description:
          'Set of 6 pairs of crystal stud earrings in assorted colors. Sterling silver posts for hypoallergenic wear. Perfect gift set.',
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/61q3CndwJUL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Mixed Colors - 6 Pairs', color: 'Multi', price: 299, stock: 20 }],
      },
      {
        title: 'Gold-Plated Pearl Drop Necklace – Elegant Choker',
        slug: 'gold-plated-pearl-drop-necklace',
        description:
          'Elegant gold-plated necklace with freshwater pearl drop pendant. Adjustable 40–45cm chain. Suitable for weddings, dinners, and special occasions.',
        basePrice: 749,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Gold / White Pearl', color: 'Gold', price: 749, stock: 10 },
          { label: 'Silver / White Pearl', color: 'Silver', price: 749, stock: 8 },
        ],
      },
      {
        title: "Women's Charm Bracelet – Stainless Steel with Pendants",
        slug: 'womens-charm-bracelet-stainless-steel',
        description:
          'Stainless steel charm bracelet with 7 interchangeable pendants including hearts, stars, and infinity symbols. Lobster clasp, adjustable 17–21cm.',
        basePrice: 449,
        img: 'https://m.media-amazon.com/images/I/61q3CndwJUL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Gold', color: 'Gold', price: 449, stock: 12 },
          { label: 'Silver', color: 'Silver', price: 449, stock: 14 },
          { label: 'Rose Gold', color: 'Rose Gold', price: 479, stock: 10 },
        ],
      },
      {
        title: 'Layered Minimalist Necklace Set – 3 Pieces',
        slug: 'layered-minimalist-necklace-set-3pieces',
        description:
          'Set of 3 dainty minimalist necklaces at different lengths for a layered look. Gold-plated chains with tiny pendant charms. Sold together.',
        basePrice: 529,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Gold Set', color: 'Gold', price: 529, stock: 10 },
          { label: 'Silver Set', color: 'Silver', price: 529, stock: 9 },
        ],
      },
      {
        title: 'Pharaonic Ankh Cross Pendant Necklace – Egyptian Symbol',
        slug: 'pharaonic-ankh-cross-pendant-necklace',
        description:
          'Eye-catching Ankh (Ancient Egyptian key of life) cross pendant on a stainless steel chain. Gold-plated or silver finish. 45cm adjustable chain.',
        basePrice: 399,
        img: 'https://m.media-amazon.com/images/I/61q3CndwJUL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Gold Plated', color: 'Gold', price: 399, stock: 15 },
          { label: 'Silver', color: 'Silver', price: 399, stock: 12 },
        ],
      },
      {
        title: "Men's Stainless Steel Black Signet Ring",
        slug: 'mens-stainless-steel-black-signet-ring',
        description:
          'Bold black stainless steel signet ring with brushed matte finish. Hypoallergenic and tarnish-resistant. Available in sizes 7–12.',
        basePrice: 329,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Size 7', size: '7', price: 329, stock: 8 },
          { label: 'Size 9', size: '9', price: 329, stock: 10 },
          { label: 'Size 11', size: '11', price: 329, stock: 7 },
        ],
      },
    ],
  },

  // ── 12. TOYS ──────────────────────────────────────────────────────────────
  {
    name: 'Toys',
    slug: 'toys',
    products: [
      {
        title: 'Magnetic Maze Puzzle Toy – Duck Design for Kids',
        slug: 'magnetic-maze-puzzle-duck-design',
        description:
          'Magnetic maze toy with a cute duck character. Children navigate the duck through the maze using a magnetic pen. Develops patience and fine motor skills.',
        basePrice: 479,
        img: 'https://m.media-amazon.com/images/I/41KVNs+MZrL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [{ label: 'Duck Design', color: 'Yellow', price: 479, stock: 15 }],
      },
      {
        title: 'KIDSZONE 20-Pack Mini Pull-Back Race Cars',
        slug: 'kidszone-20pack-mini-pullback-race-cars',
        description:
          'Set of 20 mini pull-back race cars in assorted colors and designs. No batteries needed. Perfect party favors and creative play for ages 3+.',
        basePrice: 217,
        img: 'https://m.media-amazon.com/images/I/61oufcUycuL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '20-Pack Assorted', color: 'Multi', price: 217, stock: 20 }],
      },
      {
        title: 'Shark Concert Musical Light-Up Blowing Ball Toy',
        slug: 'shark-concert-musical-blowing-ball-toy',
        description:
          'Funny shark toy that blows lightweight balls while playing music and flashing lights. Encourages gross motor skills. Batteries included. Ages 1-4.',
        basePrice: 420,
        img: 'https://m.media-amazon.com/images/I/61NU6Ti5R8L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue Shark', color: 'Blue', price: 420, stock: 15 },
          { label: 'Pink Shark', color: 'Pink', price: 420, stock: 12 },
        ],
      },
      {
        title: 'KIDSZONE Magic Water Elf Aqua Fairy Craft Kit',
        slug: 'kidszone-magic-water-elf-aqua-fairy-craft',
        description:
          'Aqua fairy water gel craft kit where children create colorful water elf characters by dripping colored solution into water. Creative STEM activity.',
        basePrice: 244,
        img: 'https://m.media-amazon.com/images/I/71wWd273U9L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Standard Kit', color: 'Multi', price: 244, stock: 18 }],
      },
      {
        title: 'LCD Writing Tablet 8.5" – Electronic Drawing Board',
        slug: 'lcd-writing-tablet-electronic-drawing-board-kids',
        description:
          '8.5-inch LCD writing tablet for kids. Draw, write, and erase with one button. No ink, no paper — endless learning and creative play.',
        basePrice: 78,
        img: 'https://m.media-amazon.com/images/I/61OemvX0anS._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue', color: 'Blue', price: 78, stock: 25 },
          { label: 'Pink', color: 'Pink', price: 78, stock: 20 },
        ],
      },
      {
        title: 'Jumbo Sea Bucket Beach Toy Set – Sand Play Kit',
        slug: 'jumbo-sea-bucket-beach-toy-set',
        description:
          'Complete beach sand play kit with a jumbo bucket, sieve, rake, and mold tools. Durable plastic that resists UV fading. Perfect for the beach or sandbox.',
        basePrice: 190,
        img: 'https://m.media-amazon.com/images/I/71FoOjGYiDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Yellow Set', color: 'Yellow', price: 190, stock: 15 },
          { label: 'Blue Set', color: 'Blue', price: 190, stock: 12 },
          { label: 'Red Set', color: 'Red', price: 190, stock: 10 },
        ],
      },
      {
        title: 'Magnetic Chess Game – Fun Family Strategy Set',
        slug: 'magnetic-chess-game-family-strategy',
        description:
          'Full-size magnetic chess set with 20 weighted pieces. Folding board doubles as a storage case. For ages 6+ and all skill levels.',
        basePrice: 132,
        img: 'https://m.media-amazon.com/images/I/71HqFGroRsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Standard', color: 'Multi', price: 132, stock: 20 }],
      },
      {
        title: '2-in-1 Transformer Robot Police Car – Remote Control',
        slug: '2in1-transformer-robot-police-car-rc',
        description:
          '2-in-1 toy that transforms from police car to standing robot. Remote control with 360° stunt mode, LED headlights, and siren sounds.',
        basePrice: 120,
        img: 'https://m.media-amazon.com/images/I/71Bmvb0E+wL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black', color: 'Black', price: 120, stock: 15 },
          { label: 'Blue', color: 'Blue', price: 120, stock: 12 },
        ],
      },
      {
        title: 'Crocodile Dentist Bite Finger Game – Party Fun',
        slug: 'crocodile-dentist-bite-finger-party-game',
        description:
          "Press the crocodile's teeth one at a time — one unlucky tooth makes it snap! Fast, funny, and unpredictable. 2-4 players, ages 4+.",
        basePrice: 105,
        img: 'https://m.media-amazon.com/images/I/61W3yu9wAcL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Green', color: 'Green', price: 105, stock: 25 }],
      },
      {
        title: 'City Star Summer Square Beach Set – Sandbox Toys',
        slug: 'city-star-summer-square-beach-sandbox-set',
        description:
          'Complete sandbox and beach play set with square bucket, shovel, rake, and sand molds. Bright durable colors for outdoor creative play.',
        basePrice: 190,
        img: 'https://m.media-amazon.com/images/I/71FoOjGYiDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Yellow', color: 'Yellow', price: 190, stock: 14 },
          { label: 'Pink', color: 'Pink', price: 190, stock: 12 },
        ],
      },
    ],
  },

  // ── 13. APPLIANCES ────────────────────────────────────────────────────────
  {
    name: 'Appliances',
    slug: 'appliances',
    products: [
      {
        title: 'Electric Air Fryer 6L – LCD Touch Screen 2400W',
        slug: 'electric-air-fryer-6l-lcd-touch',
        description:
          '6-liter air fryer with LCD touch screen and 8 preset cooking modes. Cooks with up to 80% less oil. Dishwasher-safe basket and crisper plate.',
        basePrice: 1529,
        img: 'https://m.media-amazon.com/images/I/51jp8OX3pDL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Black', color: 'Black', price: 1529, stock: 8 },
          { label: 'White', color: 'White', price: 1529, stock: 7 },
        ],
      },
      {
        title: 'Black & Decker Egg Cooker 6 Eggs – EG200-B5',
        slug: 'black-decker-egg-cooker-6-eggs',
        description:
          'Versatile electric egg cooker for hard, medium, or soft-boiled eggs plus poaching and omelettes. Automatic shut-off when cooking is complete.',
        basePrice: 1129,
        img: 'https://m.media-amazon.com/images/I/61weSgU9NrL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'White', color: 'White', price: 1129, stock: 10 }],
      },
      {
        title: 'Kenwood Electric Kettle – Rapid Boil 1.7L',
        slug: 'kenwood-electric-kettle-rapid-boil-17l',
        description:
          'Kenwood 1.7L cordless electric kettle with rapid-boil element and concealed heating plate. Auto shut-off and boil-dry protection for safety.',
        basePrice: 1380,
        img: 'https://m.media-amazon.com/images/I/61jo-mr3ySL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 1380, stock: 8 },
          { label: 'Silver', color: 'Silver', price: 1380, stock: 7 },
        ],
      },
      {
        title: 'Fresh FP402 Food Processor 1000W – Gray',
        slug: 'fresh-fp402-food-processor-1000w',
        description:
          'Fresh brand 1000W food processor with multiple attachments for chopping, slicing, shredding, and blending. Large 3L bowl with safety lock.',
        basePrice: 3463,
        img: 'https://m.media-amazon.com/images/I/61zs9SABZiL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [{ label: 'Gray', color: 'Gray', price: 3463, stock: 5 }],
      },
      {
        title: 'Kenwood Contact Grill 2000W – Adjustable Positions',
        slug: 'kenwood-contact-grill-2000w-adjustable',
        description:
          'Kenwood 2000W electric contact grill with adjustable plate positions (90° to 180°). Non-stick removable plates, drip tray, and floating hinge.',
        basePrice: 2933,
        img: 'https://m.media-amazon.com/images/I/81qorbhDGVL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Silver', color: 'Silver', price: 2933, stock: 5 }],
      },
      {
        title: 'Braun CitrusQuick 5 Citrus Juicer – CJ 5050',
        slug: 'braun-citrusquick-5-citrus-juicer',
        description:
          'Powerful Braun citrus juicer with direct-squeeze action for maximum juice extraction. Drip-proof spout, pulp filter, and easy-pour measuring jug.',
        basePrice: 1966,
        img: 'https://m.media-amazon.com/images/I/61XhYCfx2PL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'White', color: 'White', price: 1966, stock: 6 }],
      },
      {
        title: 'Philips Handheld Garment Steamer 1000 Series',
        slug: 'philips-handheld-garment-steamer-1000',
        description:
          'Compact handheld garment steamer from Philips. Ready in 40 seconds, continuous steam for wrinkle removal on all fabrics. Suitable for travel.',
        basePrice: 2283,
        img: 'https://m.media-amazon.com/images/I/412jQznXFGL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Blue/White', color: 'Blue', price: 2283, stock: 5 }],
      },
      {
        title: 'Mini Sealing Machine – Portable Handheld Packet Sealer',
        slug: 'mini-sealing-machine-portable-handheld',
        description:
          'Compact handheld heat sealer for plastic bags and food packaging. Battery-operated with indicator light. Extends food freshness by resealing bags.',
        basePrice: 143,
        img: 'https://m.media-amazon.com/images/I/61axfi8TJjL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue', color: 'Blue', price: 143, stock: 20 },
          { label: 'Green', color: 'Green', price: 143, stock: 18 },
          { label: 'Pink', color: 'Pink', price: 143, stock: 15 },
        ],
      },
      {
        title: 'Electric Salt & Pepper Grinder Set – Automatic Battery',
        slug: 'electric-salt-pepper-grinder-set-automatic',
        description:
          'Automatic battery-powered salt and pepper grinder set with adjustable coarseness. One-handed operation with gravity-activated switch. LED light at base.',
        basePrice: 3830,
        img: 'https://m.media-amazon.com/images/I/71NpF4JP7HL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black Set (2 Pcs)', color: 'Black', price: 3830, stock: 4 },
          { label: 'Silver Set (2 Pcs)', color: 'Silver', price: 3830, stock: 3 },
        ],
      },
      {
        title: 'Blender Mixer – 600W Countertop Smoothie Maker',
        slug: 'blender-mixer-600w-smoothie-maker',
        description:
          '600W countertop blender for smoothies, juices, and food processing. 1.5L BPA-free jar with stainless steel blades and 2-speed settings.',
        basePrice: 899,
        img: 'https://m.media-amazon.com/images/I/61zs9SABZiL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 899, stock: 8 },
          { label: 'Black', color: 'Black', price: 899, stock: 7 },
        ],
      },
    ],
  },

  // ── 14. GROCERIES ─────────────────────────────────────────────────────────
  {
    name: 'Groceries',
    slug: 'groceries',
    products: [
      {
        title: 'Lipton Yellow Label Black Tea – 100 Tea Bags',
        slug: 'lipton-yellow-label-black-tea-100bags',
        description:
          'Lipton Yellow Label black tea with sun-dried tea leaves for a robust, full-bodied flavor. 100 individually wrapped tea bags per box.',
        basePrice: 150,
        img: 'https://m.media-amazon.com/images/I/61nro6GH4bL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '100 Tea Bags', size: '100 bags', price: 150, stock: 30 }],
      },
      {
        title: 'Lipton Kharaz Premium Loose Black Tea – 250g',
        slug: 'lipton-kharaz-premium-loose-black-tea-250g',
        description:
          'Premium Lipton Kharaz loose leaf black tea with rich golden color and bold taste. Traditionally blended for the perfect Egyptian morning cup.',
        basePrice: 112,
        img: 'https://m.media-amazon.com/images/I/61K6e+Xw+ML._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '250g', size: '250g', price: 112, stock: 25 },
          { label: '500g', size: '500g', price: 159, stock: 20 },
        ],
      },
      {
        title: 'JUHAYNA Full Cream Milk Multipack – 6 × 1L',
        slug: 'juhayna-full-cream-milk-6pack-1l',
        description:
          'JUHAYNA Ultra-pasteurized full cream milk in a convenient 6-pack of 1L cartons. Long shelf life, no preservatives, and rich in calcium.',
        basePrice: 324,
        img: 'https://m.media-amazon.com/images/I/712t3O9xoaL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '6 × 1L', size: '6 × 1L', price: 324, stock: 20 }],
      },
      {
        title: 'Al Doha Egyptian Premium Rice – 1kg',
        slug: 'al-doha-egyptian-premium-rice-1kg',
        description:
          'Premium-grade long-grain Egyptian rice from Al Doha. Clean, white, and fluffy when cooked. A staple on every Egyptian dinner table.',
        basePrice: 64,
        img: 'https://m.media-amazon.com/images/I/71z7HgX8LFL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '1kg', size: '1kg', price: 64, stock: 40 },
          { label: '5kg', size: '5kg', price: 259, stock: 20 },
        ],
      },
      {
        title: 'Sunshine Tuna Easy Open – 200g Can',
        slug: 'sunshine-tuna-easy-open-200g',
        description:
          'Sunshine solid tuna in sunflower oil with easy-open lid. High protein, low fat. Great for sandwiches, salads, and pasta dishes.',
        basePrice: 101,
        img: 'https://m.media-amazon.com/images/I/71IuPKISOgL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '200g', size: '200g', price: 101, stock: 30 },
          { label: '4-Pack (4×200g)', size: '4×200g', price: 365, stock: 15 },
        ],
      },
      {
        title: 'Al Doha Egyptian Flour – All-Purpose 1kg',
        slug: 'al-doha-egyptian-flour-allpurpose-1kg',
        description:
          'Al Doha all-purpose wheat flour milled from premium Egyptian wheat. Ideal for bread, pastries, biscuits, and all baking needs.',
        basePrice: 54,
        img: 'https://m.media-amazon.com/images/I/81RIRHWpo0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '1kg', size: '1kg', price: 54, stock: 40 }],
      },
      {
        title: 'Elano Drinking Water Bottles – 20 × 600ml Pack',
        slug: 'elano-drinking-water-20pack-600ml',
        description:
          'Pack of 20 Elano pure drinking water bottles at 600ml each. Natural mineral water with balanced mineral content. BPA-free PET bottles.',
        basePrice: 153,
        img: 'https://m.media-amazon.com/images/I/61QdQ0UzfjL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '20 × 600ml', size: '20 bottles', price: 153, stock: 25 }],
      },
      {
        title: 'Lipton Yellow Label Tea Dust – 250g Loose',
        slug: 'lipton-yellow-label-tea-dust-250g',
        description:
          'Lipton Yellow Label fine tea dust for a strong, quick-brewing cup. Traditional Egyptian-style thick tea with rich malty flavor. 250g resealable pack.',
        basePrice: 89,
        img: 'https://m.media-amazon.com/images/I/71hWFb5kjHL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '250g', size: '250g', price: 89, stock: 30 }],
      },
      {
        title: 'Premium Egyptian Honey – Raw & Unfiltered 500g',
        slug: 'premium-egyptian-honey-raw-unfiltered-500g',
        description:
          'Raw unfiltered sidr honey harvested from Egyptian apiaries. Natural antibacterial properties, rich in enzymes and antioxidants. Pure and unprocessed.',
        basePrice: 399,
        img: 'https://m.media-amazon.com/images/I/71z7HgX8LFL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: '500g', size: '500g', price: 399, stock: 20 },
          { label: '1kg', size: '1kg', price: 749, stock: 12 },
        ],
      },
      {
        title: 'Organo Natural White Vinegar 5% Acidity – 900ml',
        slug: 'organo-natural-white-vinegar-5pct-900ml',
        description:
          'Natural white vinegar with 5% acidity. Ideal for cooking, pickling, and cleaning. Clear color, sharp taste. 900ml bottle.',
        basePrice: 43,
        img: 'https://m.media-amazon.com/images/I/6134xyItbdL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '900ml', size: '900ml', price: 43, stock: 30 }],
      },
    ],
  },

  // ── 15. AUTO ──────────────────────────────────────────────────────────────
  {
    name: 'Auto',
    slug: 'auto',
    products: [
      {
        title: 'Godrej aer O Hanging Car Air Freshener – Musk After Smoke',
        slug: 'godrej-aero-car-freshener-musk-after-smoke',
        description:
          'Long-lasting hanging car air freshener with a sophisticated musk after smoke fragrance. 7.5g lasts up to 60 days. Slim design fits any rearview mirror.',
        basePrice: 115,
        img: 'https://m.media-amazon.com/images/I/71FXQKRdu7L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Musk After Smoke', color: 'Black', price: 115, stock: 25 },
          { label: 'Rose Blossom', color: 'Pink', price: 115, stock: 22 },
        ],
      },
      {
        title: 'Godrej aer O Hanging Car Air Freshener – 3-Pack Assorted',
        slug: 'godrej-aero-car-freshener-3pack-assorted',
        description:
          'Assorted pack of 3 Godrej aer O hanging car fresheners (22.5g total). Three different signature fragrances for variety throughout the month.',
        basePrice: 260,
        img: 'https://m.media-amazon.com/images/I/71J1Pf6Qq9L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '3-Pack Assorted', color: 'Multi', price: 260, stock: 15 }],
      },
      {
        title: 'Car Sun Visor Sunglasses Clip Holder – White',
        slug: 'car-sun-visor-sunglasses-clip-holder',
        description:
          'Universal sun visor sunglasses holder clip for all car models. Keeps sunglasses within easy reach while driving. Soft inner lining prevents scratches.',
        basePrice: 155,
        img: 'https://m.media-amazon.com/images/I/71dZL4Ma8gL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 155, stock: 20 },
          { label: 'Black', color: 'Black', price: 155, stock: 18 },
        ],
      },
      {
        title: 'Car Foldable Trash Can with Lid – Multifunctional',
        slug: 'car-foldable-trash-can-with-lid',
        description:
          'Compact foldable car trash bin with a secure lid. Waterproof lining and easy-clip attachment for headrest, console, or door. Keeps your car tidy.',
        basePrice: 96,
        img: 'https://m.media-amazon.com/images/I/613Kq2rkjOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 96, stock: 22 },
          { label: 'Gray', color: 'Gray', price: 96, stock: 18 },
        ],
      },
      {
        title: 'Car Interior Detailing Brush Set – 2 Pieces',
        slug: 'car-interior-detailing-brush-set-2pcs',
        description:
          '2-piece soft auto detailing brush set for cleaning car vents, dashboard crevices, and upholstery. Scratch-free bristles and ergonomic handle.',
        basePrice: 74,
        img: 'https://m.media-amazon.com/images/I/61b14ZGFlDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '2-Piece Set', color: 'Multi', price: 74, stock: 30 }],
      },
      {
        title: 'Car Cup Coaster Set – 4-Piece Non-Slip Silicone',
        slug: 'car-cup-coaster-set-4piece-silicone',
        description:
          '4-piece universal silicone cup coasters that fit standard car cup holders. Non-slip, waterproof, and easy to clean. Protects cup holders from spills.',
        basePrice: 135,
        img: 'https://m.media-amazon.com/images/I/713NNLmDI4L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black Set', color: 'Black', price: 135, stock: 20 },
          { label: 'Gray Set', color: 'Gray', price: 135, stock: 18 },
        ],
      },
      {
        title: 'Car Windshield Foldable Sun Shade – UV Block',
        slug: 'car-windshield-foldable-sun-shade',
        description:
          'Foldable reflective windshield sun shade that blocks UV rays and keeps your car interior cool. Custom-fit accordion design for easy storage.',
        basePrice: 154,
        img: 'https://m.media-amazon.com/images/I/41gto9vM37L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Small (130×70cm)', size: 'Small', price: 154, stock: 12 },
          { label: 'Large (150×80cm)', size: 'Large', price: 199, stock: 10 },
        ],
      },
      {
        title: 'Telescopic Car Cleaning Microfiber Brush – Extendable',
        slug: 'telescopic-car-cleaning-microfiber-brush',
        description:
          'Extendable telescopic handle car washing brush with microfiber head. Reaches all areas of the car body without scratching the paint.',
        basePrice: 155,
        img: 'https://m.media-amazon.com/images/I/61yCERp-LYL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Standard', color: 'Blue', price: 155, stock: 15 }],
      },
      {
        title: 'Car Trunk Boot Organizer Bag – 48L Oxford Fabric',
        slug: 'car-trunk-boot-organizer-bag-48l',
        description:
          'Heavy-duty 48L boot storage organizer with multiple compartments and removable dividers. Non-slip base, waterproof Oxford fabric, and carry handles.',
        basePrice: 454,
        img: 'https://m.media-amazon.com/images/I/71KX3CuJ42L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 454, stock: 10 },
          { label: 'Gray', color: 'Gray', price: 454, stock: 8 },
        ],
      },
      {
        title: 'Universal Car Phone Holder – Dashboard Magnetic Mount',
        slug: 'universal-car-phone-holder-magnetic-dashboard',
        description:
          'Strong magnetic car phone holder with flexible arm and dashboard suction cup. Compatible with all smartphones. 360° rotation for optimal viewing.',
        basePrice: 199,
        img: 'https://m.media-amazon.com/images/I/71dZL4Ma8gL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Black', color: 'Black', price: 199, stock: 20 }],
      },
    ],
  },

  // ── 16. FURNITURE ─────────────────────────────────────────────────────────
  {
    name: 'Furniture',
    slug: 'furniture',
    products: [
      {
        title: 'LION HOME Glass-Top Coffee Table – Gold Frame 75cm',
        slug: 'lion-home-glass-coffee-table-gold-75cm',
        description:
          'Modern rectangular coffee table with tempered glass top and gold PVD stainless steel base. 75cm × 45cm. A stunning centerpiece for any living room.',
        basePrice: 4530,
        img: 'https://m.media-amazon.com/images/I/81nqC4Hb9VL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Gold Frame / Clear Glass', color: 'Gold', price: 4530, stock: 4 },
          { label: 'Gold Frame / Black Glass', color: 'Black', price: 4530, stock: 3 },
        ],
      },
      {
        title: 'LION HOME Round Coffee Table 75cm – Black Glass Top',
        slug: 'lion-home-round-coffee-table-75cm-black',
        description:
          'Round 75cm coffee table with black tempered glass top and gold PVD stainless steel circular base. Sleek and modern with a premium finish.',
        basePrice: 4930,
        img: 'https://m.media-amazon.com/images/I/717sIvFOX-L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Gold / Black Glass', color: 'Black', price: 4930, stock: 3 }],
      },
      {
        title: 'Plastic Rattan Outdoor Garden Set – Table & 2 Chairs',
        slug: 'plastic-rattan-outdoor-garden-set-3pcs',
        description:
          'Weather-resistant 3-piece plastic rattan outdoor set with a round table and 2 chairs. UV-stable and easy to clean. Perfect for balconies and gardens.',
        basePrice: 1129,
        img: 'https://m.media-amazon.com/images/I/51AQM8k1SNL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 1129, stock: 5 },
          { label: 'White', color: 'White', price: 1129, stock: 4 },
        ],
      },
      {
        title: 'Forbed Cloud Velvet Quilt Set – Double 4-Piece',
        slug: 'forbed-cloud-velvet-quilt-set-double-4pc',
        description:
          'Luxuriously soft Cloud Velvet 4-piece bedding set (duvet cover + fitted sheet + 2 pillowcases) for a double bed. Machine washable microfiber.',
        basePrice: 3199,
        img: 'https://m.media-amazon.com/images/I/81fWqSnaroL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Cloud Grey', color: 'Cloud Grey', price: 3199, stock: 6 },
          { label: 'Dusty Pink', color: 'Dusty Pink', price: 3199, stock: 5 },
          { label: 'Navy Blue', color: 'Navy', price: 3199, stock: 4 },
        ],
      },
      {
        title: 'Vida Designs 3-Tier Bookcase Shelving Unit – White',
        slug: 'vida-designs-3tier-bookcase-white',
        description:
          'Classic 3-tier bookcase shelving unit in white wood finish. Sturdy MDF with adjustable shelf heights. 70cm H × 60cm W × 24cm D.',
        basePrice: 703,
        img: 'https://m.media-amazon.com/images/I/61vsfFIUN5L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 703, stock: 7 },
          { label: 'Oak', color: 'Oak', price: 703, stock: 5 },
        ],
      },
      {
        title: 'Living Room Sofa Set 4-Piece – Beige Fabric',
        slug: 'living-room-sofa-set-4piece-beige',
        description:
          '4-piece fabric sofa set (3-seater sofa + 2-seater sofa + 2 armchairs) in elegant beige upholstery. Solid wood frame with foam cushioning.',
        basePrice: 2454,
        img: 'https://m.media-amazon.com/images/I/61Ivxpnv6iL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Beige', color: 'Beige', price: 2454, stock: 3 },
          { label: 'Light Gray', color: 'Gray', price: 2454, stock: 3 },
        ],
      },
      {
        title: 'Outdoor Garden Table & Chair Set – 4 Chairs, Black',
        slug: 'outdoor-garden-table-chair-set-4chairs-black',
        description:
          'Modern 5-piece outdoor dining set with a round table and 4 stackable chairs. Weather-resistant powder-coated steel frame. Ideal for patio or garden.',
        basePrice: 1879,
        img: 'https://m.media-amazon.com/images/I/51zJjyxMeDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Black', color: 'Black', price: 1879, stock: 4 }],
      },
      {
        title: 'Madesa Home Office Writing Desk – 3 Drawers & Door',
        slug: 'madesa-home-office-writing-desk-3drawers',
        description:
          'Compact home office writing desk with 3 drawers, 1 door, and 1 open shelf. Ample storage for a clean workspace. Easy self-assembly.',
        basePrice: 3467,
        img: 'https://m.media-amazon.com/images/I/71W5fHt-VDL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 3467, stock: 4 },
          { label: 'Oak', color: 'Oak', price: 3467, stock: 3 },
        ],
      },
      {
        title: 'Modern 2-Door Wardrobe – White Mirrored Panel',
        slug: 'modern-2door-wardrobe-white-mirrored',
        description:
          'Sleek 2-door wardrobe with a full-length mirrored door panel. Interior hanging rail and 3 fixed shelves. Engineered wood with soft-close hinges.',
        basePrice: 4299,
        img: 'https://m.media-amazon.com/images/I/61vsfFIUN5L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'White / Mirror', color: 'White', price: 4299, stock: 3 }],
      },
      {
        title: 'Adjustable Office Chair – Ergonomic Mesh Back',
        slug: 'adjustable-office-chair-ergonomic-mesh',
        description:
          'Ergonomic office chair with breathable mesh back, adjustable lumbar support, and height-adjustable armrests. 360° swivel with smooth caster wheels.',
        basePrice: 1899,
        img: 'https://m.media-amazon.com/images/I/61Ivxpnv6iL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Black', color: 'Black', price: 1899, stock: 6 },
          { label: 'Gray', color: 'Gray', price: 1899, stock: 5 },
        ],
      },
    ],
  },

  // ── 17. BOOKS ─────────────────────────────────────────────────────────────
  {
    name: 'Books',
    slug: 'books',
    products: [
      {
        title: 'Atomic Habits – James Clear (English Paperback)',
        slug: 'atomic-habits-james-clear-paperback',
        description:
          "The #1 international bestseller on building good habits and breaking bad ones. James Clear's proven framework for making tiny changes that lead to remarkable results.",
        basePrice: 349,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 349, stock: 15 }],
      },
      {
        title: 'The 48 Laws of Power – Robert Greene (Paperback)',
        slug: 'the-48-laws-of-power-robert-greene',
        description:
          "Robert Greene's modern Machiavellian classic drawing on the lives of powerful historical figures. Distills 3,000 years of the history of power into 48 essential laws.",
        basePrice: 429,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 429, stock: 12 }],
      },
      {
        title: 'Think and Grow Rich – Napoleon Hill (Paperback)',
        slug: 'think-and-grow-rich-napoleon-hill',
        description:
          "Napoleon Hill's timeless classic that has helped millions achieve success. Based on interviews with over 500 successful people including Henry Ford and Andrew Carnegie.",
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 299, stock: 14 }],
      },
      {
        title: 'الخيميائي – باولو كويلو (عربي)',
        slug: 'al-khimyaai-paulo-coelho-arabic',
        description:
          'رواية الخيميائي الشهيرة لباولو كويلو باللغة العربية. قصة ملهمة عن الأحلام واتباع القدر الشخصي. من أكثر الكتب مبيعاً في العالم بأكثر من 65 مليون نسخة.',
        basePrice: 199,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 199, stock: 18 }],
      },
      {
        title: 'Rich Dad Poor Dad – Robert Kiyosaki (Paperback)',
        slug: 'rich-dad-poor-dad-kiyosaki-paperback',
        description:
          "Robert Kiyosaki's #1 personal finance book of all time. Teaches you what the rich teach their kids about money that the poor and middle class do not.",
        basePrice: 329,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 329, stock: 12 }],
      },
      {
        title: 'The Psychology of Money – Morgan Housel (Paperback)',
        slug: 'the-psychology-of-money-morgan-housel',
        description:
          'Timeless lessons on wealth, greed, and happiness. Morgan Housel shares 19 short stories exploring the strange ways people think about money.',
        basePrice: 349,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 349, stock: 10 }],
      },
      {
        title: 'قوة اللحظة الحاضرة – إيكهارت تول (عربي)',
        slug: 'power-of-now-eckhart-tolle-arabic',
        description:
          'ترجمة عربية لكتاب "قوة اللحظة الحاضرة" لإيكهارت تول، دليل شامل للتنوير الروحي وتحقيق السلام الداخلي من خلال التركيز على اللحظة الراهنة.',
        basePrice: 249,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 249, stock: 14 }],
      },
      {
        title: 'Meditations – Marcus Aurelius (Paperback)',
        slug: 'meditations-marcus-aurelius-paperback',
        description:
          'The Stoic philosophy of Roman Emperor Marcus Aurelius. Personal reflections written as a source for his own guidance and self-improvement. A timeless classic.',
        basePrice: 279,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 279, stock: 12 }],
      },
      {
        title: 'Ikigai – The Japanese Secret to a Long and Happy Life',
        slug: 'ikigai-japanese-secret-long-happy-life',
        description:
          'The Japanese concept of finding your purpose in life. Explores the Okinawan philosophy of staying active, eating well, and fostering community — the recipe for longevity.',
        basePrice: 319,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: true,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 319, stock: 10 }],
      },
      {
        title: 'كتاب العادات الذرية – جيمس كلير (عربي)',
        slug: 'atomic-habits-james-clear-arabic',
        description:
          'النسخة العربية من كتاب "العادات الذرية" لجيمس كلير. دليل عملي لبناء عادات إيجابية والتخلص من العادات السيئة من خلال تغييرات صغيرة تؤدي إلى نتائج مذهلة.',
        basePrice: 279,
        img: 'https://m.media-amazon.com/images/I/71fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Paperback', size: 'Paperback', price: 279, stock: 15 }],
      },
    ],
  },

  // ── 18. HEALTH ────────────────────────────────────────────────────────────
  {
    name: 'Health',
    slug: 'health',
    products: [
      {
        title: 'Listerine Total Care Tartar Protect Mouthwash – 250ml',
        slug: 'listerine-total-care-tartar-protect-250ml',
        description:
          'Listerine Total Care mouthwash with fluoride for cavity protection and tartar prevention. Arctic mint flavor for lasting fresh breath. 250ml bottle.',
        basePrice: 154,
        img: 'https://m.media-amazon.com/images/I/61hkdhb2Z9L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '250ml Arctic Mint', size: '250ml', price: 154, stock: 20 },
          { label: '500ml Arctic Mint', size: '500ml', price: 249, stock: 15 },
        ],
      },
      {
        title: 'Purity Rosemary Oil – Cold Pressed 100% Pure 125ml',
        slug: 'purity-rosemary-oil-cold-pressed-125ml',
        description:
          '100% pure cold-pressed rosemary oil for hair growth and scalp health. No additives or preservatives. Rich in antioxidants and anti-inflammatory properties.',
        basePrice: 180,
        img: 'https://m.media-amazon.com/images/I/61towdQuK3L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '125ml', size: '125ml', price: 180, stock: 18 }],
      },
      {
        title: 'Limitless Naturals Omega-3 Fish Oil – 2000mg 30 Capsules',
        slug: 'limitless-naturals-omega3-fish-oil-2000mg',
        description:
          'High-potency omega-3 fish oil softgels at 2000mg per serving. Supports heart, brain, and joint health. Enteric-coated to prevent fishy aftertaste.',
        basePrice: 259,
        img: 'https://m.media-amazon.com/images/I/51ywutvuxkL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '30 Capsules', size: '30 Caps', price: 259, stock: 15 },
          { label: '60 Capsules', size: '60 Caps', price: 449, stock: 12 },
        ],
      },
      {
        title: 'Xiaomi Body Fat Scale S400 – Dual Frequency BIA',
        slug: 'xiaomi-body-fat-scale-s400-dual-frequency',
        description:
          'Smart body fat scale with dual-frequency bioelectrical impedance analysis (BIA) for accurate body composition measurements. Syncs with Mi Health app via Bluetooth.',
        basePrice: 1328,
        img: 'https://m.media-amazon.com/images/I/51keV3OO2kL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [{ label: 'White', color: 'White', price: 1328, stock: 8 }],
      },
      {
        title: 'Professional Manicure & Pedicure Set – 16-in-1 Kit',
        slug: 'professional-manicure-pedicure-set-16in1',
        description:
          'Complete 16-piece nail care kit in a compact travel case. Includes nail clippers, cuticle pusher, nail file, and more. Stainless steel tools.',
        basePrice: 178,
        img: 'https://m.media-amazon.com/images/I/812J5f-zCzL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '16-Piece Set', size: '16 Pcs', price: 178, stock: 20 }],
      },
      {
        title: 'Jade Roller & Gua Sha Tool Set – Natural Himalayan Stone',
        slug: 'jade-roller-gua-sha-natural-himalayan-stone',
        description:
          'Natural jade facial roller and gua sha sculpting tool set. Reduces puffiness and promotes lymphatic drainage. Use with your favorite facial oil or serum.',
        basePrice: 101,
        img: 'https://m.media-amazon.com/images/I/618g2atqdRL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Green Jade', color: 'Green', price: 101, stock: 20 },
          { label: 'Rose Quartz', color: 'Pink', price: 129, stock: 15 },
        ],
      },
      {
        title: 'MCP Healthcare Mini Deep Tissue Muscle Massager',
        slug: 'mcp-healthcare-mini-deep-tissue-massager',
        description:
          'Compact percussion massager for deep tissue muscle relief. 3 speed settings and interchangeable massage heads. Battery-operated for portable use.',
        basePrice: 117,
        img: 'https://m.media-amazon.com/images/I/71+JHGo3nfL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Black', color: 'Black', price: 117, stock: 18 }],
      },
      {
        title: 'Digital Finger Counter with LCD – Portable Tasbeeh',
        slug: 'digital-finger-counter-lcd-tasbeeh',
        description:
          'Portable digital finger tally counter with LCD display. Perfect as a tasbeeh (dhikr) counter, inventory counter, or lap counter. One-click count and reset button.',
        basePrice: 53,
        img: 'https://m.media-amazon.com/images/I/31Uom1tZDLL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 53, stock: 40 },
          { label: 'Black', color: 'Black', price: 53, stock: 35 },
        ],
      },
      {
        title: 'Dual Toothbrush – Duo Clean Medium Bristles',
        slug: 'dual-toothbrush-duo-clean-medium',
        description:
          'Professional-grade dual-action toothbrush with medium bristles. Dual head design for superior plaque removal. Ergonomic non-slip handle.',
        basePrice: 95,
        img: 'https://m.media-amazon.com/images/I/51-uLGT3RZL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: 'Medium Bristle', size: 'Medium', price: 95, stock: 25 }],
      },
      {
        title: 'Spicekick Cold-Pressed Cabbage Seed Oil – 100ml',
        slug: 'spicekick-cold-pressed-cabbage-seed-oil-100ml',
        description:
          'Cold-pressed cabbage seed oil rich in vitamins A, C, and K. Supports skin health and hair shine. 100% natural with no additives.',
        basePrice: 380,
        img: 'https://m.media-amazon.com/images/I/61eGzIiWGWL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '100ml', size: '100ml', price: 380, stock: 12 }],
      },
    ],
  },

  // ── 19. PETS ──────────────────────────────────────────────────────────────
  {
    name: 'Pets',
    slug: 'pets',
    products: [
      {
        title: 'Pet Nail Clipper for Dogs & Cats – with Nail File',
        slug: 'pet-nail-clipper-dogs-cats-with-nail-file',
        description:
          'Professional stainless steel nail clipper for dogs and cats. Safety guard prevents over-cutting. Includes a bonus nail file for smooth finishing.',
        basePrice: 140,
        img: 'https://m.media-amazon.com/images/I/51CwdNo0P7L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Small (Cats & Small Dogs)', size: 'Small', price: 140, stock: 20 },
          { label: 'Large (Medium & Large Dogs)', size: 'Large', price: 140, stock: 15 },
        ],
      },
      {
        title: 'Dog Water Bottle – Portable with Food Container 750ml',
        slug: 'dog-water-bottle-portable-food-container-750ml',
        description:
          'All-in-one portable 750ml pet water bottle with detachable food container. One-button water dispenser bowl. Leak-proof and BPA-free. Perfect for walks.',
        basePrice: 629,
        img: 'https://m.media-amazon.com/images/I/815ExaNTCBL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue', color: 'Blue', price: 629, stock: 10 },
          { label: 'Pink', color: 'Pink', price: 629, stock: 9 },
          { label: 'Yellow', color: 'Yellow', price: 629, stock: 8 },
        ],
      },
      {
        title: 'PAWPAW Complete Pet Supplies Starter Kit – Small Blue',
        slug: 'pawpaw-complete-pet-supplies-kit-small-blue',
        description:
          'Complete starter kit for small dogs and cats. Includes food bowl, water bowl, leash, collar, and toys. Everything your new pet needs in one set.',
        basePrice: 2030,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Blue Set', color: 'Blue', price: 2030, stock: 5 },
          { label: 'Red Set', color: 'Red', price: 2030, stock: 5 },
        ],
      },
      {
        title: 'Pet Grooming Gloves – Gentle Silicone Tips for Dogs & Cats',
        slug: 'pet-grooming-gloves-silicone-dogs-cats',
        description:
          'Gentle silicone-tip grooming gloves for pet brushing, massage, and deshedding. Works on short and medium coats. Machine washable and hair-repellent.',
        basePrice: 109,
        img: 'https://m.media-amazon.com/images/I/51CwdNo0P7L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue - Pair', color: 'Blue', price: 109, stock: 25 },
          { label: 'Pink - Pair', color: 'Pink', price: 109, stock: 20 },
        ],
      },
      {
        title: 'Cat Self-Cleaning Litter Box – Enclosed with Lid',
        slug: 'cat-self-cleaning-litter-box-enclosed',
        description:
          'Large enclosed cat litter box with top entry and built-in scoop holder. Reduces odors and prevents litter tracking. Easy to clean removable base.',
        basePrice: 899,
        img: 'https://m.media-amazon.com/images/I/61q3CndwJUL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Gray', color: 'Gray', price: 899, stock: 7 },
          { label: 'Beige', color: 'Beige', price: 899, stock: 6 },
        ],
      },
      {
        title: 'Dog Adjustable Nylon Harness – No-Pull Vest Style',
        slug: 'dog-adjustable-nylon-harness-no-pull',
        description:
          'No-pull reflective dog harness with adjustable straps for a secure fit. Two leash attachment points and padded chest plate for comfort.',
        basePrice: 349,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Red - S (5-10kg)', color: 'Red', size: 'S', price: 349, stock: 10 },
          { label: 'Blue - M (10-20kg)', color: 'Blue', size: 'M', price: 349, stock: 9 },
          { label: 'Black - L (20-40kg)', color: 'Black', size: 'L', price: 349, stock: 7 },
        ],
      },
      {
        title: 'Stainless Steel Pet Food & Water Bowl Set',
        slug: 'stainless-steel-pet-food-water-bowl-set',
        description:
          'Set of 2 stainless steel bowls for pet food and water. Non-slip silicone base, dishwasher safe, and hygienic. Available in 3 sizes.',
        basePrice: 199,
        img: 'https://m.media-amazon.com/images/I/51CwdNo0P7L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Small (400ml)', size: 'Small', price: 199, stock: 15 },
          { label: 'Medium (800ml)', size: 'Medium', price: 249, stock: 12 },
          { label: 'Large (1200ml)', size: 'Large', price: 299, stock: 10 },
        ],
      },
      {
        title: 'Interactive Cat Wand Toy – Feather Teaser',
        slug: 'interactive-cat-wand-toy-feather-teaser',
        description:
          'Retractable cat wand toy with colorful feather and bell teaser. Encourages natural hunting instincts and keeps cats active. Extendable rod for safe play distance.',
        basePrice: 159,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Rainbow Feather', color: 'Multi', price: 159, stock: 20 },
          { label: 'Blue Feather', color: 'Blue', price: 159, stock: 18 },
        ],
      },
      {
        title: 'Dog Training Clicker with Wrist Strap',
        slug: 'dog-training-clicker-with-wrist-strap',
        description:
          'Simple and effective dog training clicker with soft ergonomic button and wrist strap. Clear click sound for precise positive reinforcement training.',
        basePrice: 79,
        img: 'https://m.media-amazon.com/images/I/51CwdNo0P7L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue', color: 'Blue', price: 79, stock: 30 },
          { label: 'Red', color: 'Red', price: 79, stock: 25 },
        ],
      },
      {
        title: 'Cat Tunnel Crinkle Collapsible Play Tube',
        slug: 'cat-tunnel-crinkle-collapsible-play-tube',
        description:
          'Collapsible crinkle play tunnel for cats with 3 openings and a hanging pompom toy inside. Folds flat for easy storage. Stimulates hide-and-seek play.',
        basePrice: 289,
        img: 'https://m.media-amazon.com/images/I/61Ynq-q2nsL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Blue/Gray', color: 'Blue', price: 289, stock: 15 },
          { label: 'Rainbow', color: 'Multi', price: 289, stock: 12 },
        ],
      },
    ],
  },

  // ── 20. GARDEN ────────────────────────────────────────────────────────────
  {
    name: 'Garden',
    slug: 'garden',
    products: [
      {
        title: 'Adjustable Garden Hose Nozzle – 8-Pattern Spray',
        slug: 'adjustable-garden-hose-nozzle-8pattern',
        description:
          '8-pattern spray nozzle for garden hoses. Ergonomic non-slip grip, corrosion-resistant brass fitting, and thumb control flow. Great for watering plants and washing cars.',
        basePrice: 179,
        img: 'https://m.media-amazon.com/images/I/61fRwSb0z0L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Green', color: 'Green', price: 179, stock: 20 },
          { label: 'Black', color: 'Black', price: 179, stock: 18 },
        ],
      },
      {
        title: 'Ceramic Plant Pot Set – 3 Sizes with Drainage Holes',
        slug: 'ceramic-plant-pot-set-3sizes-drainage',
        description:
          'Set of 3 ceramic plant pots in small, medium, and large sizes. Each has a drainage hole with matching tray. Minimalist matte finish in neutral tones.',
        basePrice: 399,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'White Set', color: 'White', price: 399, stock: 10 },
          { label: 'Terracotta Set', color: 'Terracotta', price: 399, stock: 9 },
          { label: 'Black Set', color: 'Black', price: 399, stock: 8 },
        ],
      },
      {
        title: 'Garden Tool Set 5-Piece – Ergonomic Non-Slip Handles',
        slug: 'garden-tool-set-5piece-ergonomic',
        description:
          '5-piece garden tool set including trowel, transplanter, weeder, cultivator, and rake. Rust-resistant stainless steel heads with soft ergonomic handles.',
        basePrice: 349,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '5-Piece Set', color: 'Multi', price: 349, stock: 12 }],
      },
      {
        title: 'Herb Seed Kit – 10 Varieties for Indoor Garden',
        slug: 'herb-seed-kit-10-varieties-indoor',
        description:
          '10-pack herb seed kit including basil, mint, coriander, parsley, and more. Includes biodegradable peat pellets and labeled plant markers. Grow fresh herbs at home.',
        basePrice: 199,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '10 Herb Varieties', color: 'Multi', price: 199, stock: 15 }],
      },
      {
        title: 'Self-Watering Planter Box – Window Sill Rectangle',
        slug: 'self-watering-planter-box-window-sill',
        description:
          'Rectangular self-watering planter with a built-in water reservoir. Perfect for windowsills, balconies, and patios. Includes water level indicator.',
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/51AQM8k1SNL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White - 50cm', color: 'White', size: '50cm', price: 299, stock: 10 },
          { label: 'Terracotta - 60cm', color: 'Terracotta', size: '60cm', price: 349, stock: 8 },
        ],
      },
      {
        title: 'Organic Compost Fertilizer – 5kg Plant Food',
        slug: 'organic-compost-fertilizer-5kg-plant-food',
        description:
          '100% organic slow-release compost fertilizer. Enriches soil with essential nutrients for flowers, vegetables, and houseplants. Eco-friendly and non-toxic.',
        basePrice: 189,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '5kg Bag', size: '5kg', price: 189, stock: 15 },
          { label: '10kg Bag', size: '10kg', price: 329, stock: 10 },
        ],
      },
      {
        title: 'Succulent & Cactus Potting Mix – Ready to Use 3L',
        slug: 'succulent-cactus-potting-mix-ready-3l',
        description:
          'Ready-to-use well-draining potting mix specially formulated for succulents and cacti. Fast-draining perlite blend to prevent root rot.',
        basePrice: 149,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '3L Bag', size: '3L', price: 149, stock: 20 }],
      },
      {
        title: 'Hanging Macramé Plant Hanger – Boho Décor 3-Pack',
        slug: 'hanging-macrame-plant-hanger-boho-3pack',
        description:
          'Set of 3 handmade cotton rope macramé plant hangers in different lengths. Bohemian aesthetic for indoor and outdoor pots up to 20cm. Includes wooden beads.',
        basePrice: 249,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'Natural White - 3-Pack', color: 'White', price: 249, stock: 15 },
          { label: 'Natural Beige - 3-Pack', color: 'Beige', price: 249, stock: 12 },
        ],
      },
      {
        title: 'Drip Irrigation Kit – 50-Piece DIY Garden System',
        slug: 'drip-irrigation-kit-50piece-diy',
        description:
          '50-piece DIY drip irrigation starter kit for efficient garden watering. Includes 15m tubing, adjustable drip emitters, stakes, and connectors. Saves up to 70% water.',
        basePrice: 329,
        img: 'https://m.media-amazon.com/images/I/71WKtsLjzOL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '50-Piece Kit', color: 'Black', price: 329, stock: 10 }],
      },
      {
        title: 'Plastic Outdoor Garden Chair – UV Resistant Stackable',
        slug: 'plastic-outdoor-garden-chair-uv-resistant',
        description:
          'Sturdy UV-resistant stackable plastic garden chair with armrests. Holds up to 120kg. Weatherproof and easy to clean. Available in 4 colors.',
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/51AQM8k1SNL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 299, stock: 15 },
          { label: 'Green', color: 'Green', price: 299, stock: 12 },
          { label: 'Red', color: 'Red', price: 299, stock: 10 },
          { label: 'Black', color: 'Black', price: 299, stock: 10 },
        ],
      },
    ],
  },

  // ── 21. PHARMA ────────────────────────────────────────────────────────────
  {
    name: 'Pharma',
    slug: 'pharma',
    products: [
      {
        title: 'Listerine Cool Mint Antiseptic Mouthwash – 250ml',
        slug: 'listerine-cool-mint-antiseptic-mouthwash-250ml',
        description:
          'Listerine Cool Mint antiseptic mouthwash kills 99.9% of germs that cause bad breath, plaque, and gingivitis. Alcohol-based, 250ml bottle.',
        basePrice: 145,
        img: 'https://m.media-amazon.com/images/I/61hkdhb2Z9L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '250ml', size: '250ml', price: 145, stock: 20 },
          { label: '500ml', size: '500ml', price: 229, stock: 15 },
        ],
      },
      {
        title: 'Hydrating Ceramide Moisturizing Cream – 100ml',
        slug: 'hydrating-ceramide-moisturizing-cream-100ml',
        description:
          'Dermatologist-recommended multi-use face and body cream loaded with 3 essential skin-protective ceramides. Restores the skin barrier and locks in moisture.',
        basePrice: 219,
        img: 'https://m.media-amazon.com/images/I/61towdQuK3L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: '100ml Jar', size: '100ml', price: 219, stock: 20 },
          { label: '200ml Family Jar', size: '200ml', price: 329, stock: 15 },
        ],
      },
      {
        title: 'Zinc + Vitamin C Immune Support Tablets – 60 Count',
        slug: 'zinc-vitamin-c-immune-support-tablets-60',
        description:
          '60-tablet zinc plus vitamin C supplement for daily immune support. Each tablet provides 15mg zinc and 500mg vitamin C. Sugar-free formula.',
        basePrice: 299,
        img: 'https://m.media-amazon.com/images/I/51ywutvuxkL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '60 Tablets', size: '60 Tabs', price: 299, stock: 18 }],
      },
      {
        title: 'Blood Pressure Monitor – Automatic Upper Arm Digital',
        slug: 'blood-pressure-monitor-automatic-upper-arm',
        description:
          'Clinically validated automatic upper arm blood pressure monitor. Large LCD display, memory for 60 readings, irregular heartbeat detection, and USB charging.',
        basePrice: 929,
        img: 'https://m.media-amazon.com/images/I/51keV3OO2kL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [
          { label: 'Standard Cuff', size: 'Standard', price: 929, stock: 8 },
          { label: 'Large Cuff', size: 'Large', price: 929, stock: 6 },
        ],
      },
      {
        title: 'Digital Infrared Forehead Thermometer – Non-Contact',
        slug: 'digital-infrared-forehead-thermometer',
        description:
          'Non-contact infrared forehead thermometer for instant temperature readings in 1 second. Dual mode for body and object temperature. Memory stores 32 readings.',
        basePrice: 399,
        img: 'https://m.media-amazon.com/images/I/51keV3OO2kL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [
          { label: 'White', color: 'White', price: 399, stock: 10 },
          { label: 'Gray', color: 'Gray', price: 399, stock: 8 },
        ],
      },
      {
        title: 'Five Fives Salicylic Acid Soap – 50g Acne Control',
        slug: 'five-fives-salicylic-acid-soap-50g',
        description:
          'Medicated salicylic acid soap bar for acne-prone skin. Unclogs pores, reduces blackheads, and controls sebum. Dermatologist-tested formulation.',
        basePrice: 58,
        img: 'https://images-eu.ssl-images-amazon.com/images/I/61SRoM-MhWL._AC_UL600_SR600,400_.jpg',
        isFeatured: false,
        variants: [{ label: '50g Bar', size: '50g', price: 58, stock: 30 }],
      },
      {
        title: 'Vitamin D3 2000 IU Softgels – 90 Capsules',
        slug: 'vitamin-d3-2000iu-softgels-90-capsules',
        description:
          'Vitamin D3 2000 IU cholecalciferol softgels. Supports bone health, immune function, and mood. Easy-swallow softgel capsules in olive oil base for optimal absorption.',
        basePrice: 249,
        img: 'https://m.media-amazon.com/images/I/51ywutvuxkL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '90 Softgels', size: '90 Caps', price: 249, stock: 15 }],
      },
      {
        title: 'Natural Eucalyptus Vapor Chest Rub – 50g',
        slug: 'natural-eucalyptus-vapor-chest-rub-50g',
        description:
          'Aromatic vaporizing chest rub with pure eucalyptus oil to relieve cold, cough, and nasal congestion. Natural formulation safe for adults and children over 2.',
        basePrice: 109,
        img: 'https://m.media-amazon.com/images/I/61towdQuK3L._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '50g Jar', size: '50g', price: 109, stock: 25 }],
      },
      {
        title: 'Multivitamin Complete for Adults – 60 Tablets',
        slug: 'multivitamin-complete-adults-60-tablets',
        description:
          '60-tablet complete multivitamin supplement with 23 essential vitamins and minerals including A, B-complex, C, D, E, iron, zinc, and magnesium.',
        basePrice: 389,
        img: 'https://m.media-amazon.com/images/I/51ywutvuxkL._AC_UL320_.jpg',
        isFeatured: false,
        variants: [{ label: '60 Tablets', size: '60 Tabs', price: 389, stock: 15 }],
      },
      {
        title: 'First Aid Kit – 100-Piece Complete Emergency Box',
        slug: 'first-aid-kit-100-piece-emergency-box',
        description:
          '100-piece comprehensive first aid kit in a waterproof hard case. Includes bandages, gauze, antiseptic wipes, gloves, scissors, tweezers, and more. CE certified.',
        basePrice: 499,
        img: 'https://m.media-amazon.com/images/I/51keV3OO2kL._AC_UL320_.jpg',
        isFeatured: true,
        variants: [{ label: '100-Piece Kit', size: '100 Pcs', price: 499, stock: 10 }],
      },
    ],
  },
];

export async function POST(req: Request) {
  // ── Authentication Check ──
  const authHeader = req.headers.get('x-seed-secret');
  const session = await getServerSession(authOptions);

  const isSessionAdmin = session && (session.user as SessionUser).role === 'ADMIN';
  const isHeaderValid = authHeader && authHeader === process.env.SEED_SECRET;

  if (!isSessionAdmin && !isHeaderValid) {
    return NextResponse.json(
      { message: 'Unauthorized. Invalid seed credentials.' },
      { status: 401 }
    );
  }

  try {
    console.log('🌱 Starting safe, production-friendly catalog seeding...');

    // 1. Ensure the default seller account exists so we can map products to it
    const sellerEmail = 'seller@seller.com';
    let sellerUser = await prisma.user.findUnique({ where: { email: sellerEmail } });

    if (!sellerUser) {
      const sellerPwHash = await bcrypt.hash('seller1234', 12);
      sellerUser = await prisma.user.create({
        data: {
          name: 'Demo Seller',
          email: sellerEmail,
          passwordHash: sellerPwHash,
          role: 'SELLER',
          emailVerified: new Date(),
        },
      });
      console.log(`  ➕ Created default seller user: ${sellerEmail}`);
    }

    let sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: sellerUser.id } });

    if (!sellerProfile) {
      sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: sellerUser.id,
          storeName: 'Brandy Store',
          description: 'Official seed products collection for local brand showcase.',
          status: 'ACTIVE',
          balance: 0,
          commissionRate: 0.15,
        },
      });
      console.log(`  ➕ Created default active seller profile: Brandy Store`);
    } else if (sellerProfile.status !== 'ACTIVE') {
      await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { status: 'ACTIVE' },
      });
      console.log(`  ⚡ Force updated seller status to ACTIVE`);
    }

    // 2. Perform upsert-based seeding
    let categoryUpsertCount = 0;
    let productUpsertCount = 0;
    let imageUpsertCount = 0;
    let variantUpsertCount = 0;

    for (const catData of CATALOG) {
      // Upsert Category
      const category = await prisma.category.upsert({
        where: { slug: catData.slug },
        update: { name: catData.name },
        create: { name: catData.name, slug: catData.slug },
      });
      categoryUpsertCount++;

      for (const p of catData.products) {
        // Upsert Product (always published, Egyptian-origin, local verified)
        const product = await prisma.product.upsert({
          where: { slug: p.slug },
          update: {
            title: p.title,
            description: p.description,
            basePrice: p.basePrice,
            published: true,
            isFeatured: p.isFeatured,
            condition: 'NEW',
            countryOfOrigin: 'Egypt',
            isVerifiedLocal: true,
            deletedAt: null,
          },
          create: {
            sellerId: sellerProfile.id,
            categoryId: category.id,
            title: p.title,
            slug: p.slug,
            description: p.description,
            basePrice: p.basePrice,
            published: true,
            isFeatured: p.isFeatured,
            condition: 'NEW',
            countryOfOrigin: 'Egypt',
            isVerifiedLocal: true,
          },
        });
        productUpsertCount++;

        // Sync Product Images (Safe to recreate since nothing refers to image records directly)
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await prisma.productImage.create({
          data: { productId: product.id, url: p.img, isPrimary: true },
        });
        imageUpsertCount++;

        // Sync Product Variants via Idempotent SKU Upsert
        for (let vi = 0; vi < p.variants.length; vi++) {
          const v = p.variants[vi];
          const attrs: Record<string, string> = {};
          if (v.color) attrs.color = v.color;
          if (v.size) attrs.size = v.size;

          await prisma.productVariant.upsert({
            where: { sku: `${p.slug}-v${vi + 1}` },
            update: {
              title: v.label,
              attributes: JSON.stringify(attrs),
              price: v.price,
              stockCount: v.stock,
            },
            create: {
              productId: product.id,
              sku: `${p.slug}-v${vi + 1}`,
              title: v.label,
              attributes: JSON.stringify(attrs),
              price: v.price,
              stockCount: v.stock,
            },
          });
          variantUpsertCount++;
        }
      }
    }

    console.log('🎉 Seeding successfully completed without data wiping!');
    return NextResponse.json({
      message: 'Seeding successfully completed.',
      summary: {
        categoriesSeeded: categoryUpsertCount,
        productsSeeded: productUpsertCount,
        primaryImagesSeeded: imageUpsertCount,
        variantsSeeded: variantUpsertCount,
      },
    });
  } catch (error: any) {
    console.error('❌ Seeding failed with error:', error);
    return NextResponse.json(
      {
        message: 'Seeding failed due to internal error.',
        error: error.message || error,
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/seed-catalog
// Clears ALL products (+ cascaded variants, images, cart items, wishlists)
// belonging to the Brandy Store demo seller account.
// Requires: ADMIN session OR x-seed-secret header matching SEED_SECRET env var.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const authHeader = req.headers.get('x-seed-secret');
  const session = await getServerSession(authOptions);

  const isSessionAdmin = session && (session.user as SessionUser).role === 'ADMIN';
  const isHeaderValid = authHeader && authHeader === process.env.SEED_SECRET;

  if (!isSessionAdmin && !isHeaderValid) {
    return NextResponse.json(
      { message: 'Unauthorized. Admin session or seed secret required.' },
      { status: 401 }
    );
  }

  try {
    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: { user: { email: 'seller@seller.com' } },
      select: { id: true, storeName: true },
    });

    if (!sellerProfile) {
      return NextResponse.json({
        message: 'Brandy Store seller not found in DB. Nothing to delete.',
        deleted: 0,
      });
    }

    // Hard delete — ProductVariant, ProductImage, CartItem, Wishlist, Review,
    // ProductQA all have onDelete: Cascade in the schema, so they go with the product.
    const deleted = await prisma.product.deleteMany({
      where: { sellerId: sellerProfile.id },
    });

    console.log(`🗑️  Deleted ${deleted.count} products from "${sellerProfile.storeName}"`);

    return NextResponse.json({
      message: `Successfully cleared ${deleted.count} products from "${sellerProfile.storeName}".`,
      deleted: deleted.count,
    });
  } catch (error: any) {
    console.error('❌ Product deletion failed:', error);
    return NextResponse.json(
      { message: 'Deletion failed due to internal error.', error: error.message || error },
      { status: 500 }
    );
  }
}
