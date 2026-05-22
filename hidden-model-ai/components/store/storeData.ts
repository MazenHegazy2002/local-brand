export interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  images: string[];
  description: string;
  details: string[];
  shipping: string;
  colors: { name: string; class: string; imageIndex: number }[];
  sizes: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Neo-Tokyo Bomber',
    price: '$240.00',
    category: 'Outerwear',
    images: [
      '/products/1/photo_2025-12-20_04-39-53.webp',
      '/products/1/photo_2025-12-20_04-39-56.webp',
      '/products/1/photo_2025-12-20_04-39-58.webp',
      '/products/1/v8qlj9v8qlj9v8ql.webp',
    ],
    description:
      'A cyberpunk-inspired bomber jacket featuring high-density nylon construction and luminescent piping. Designed for the urban explorer, this piece combines tactical utility with avant-garde aesthetics.',
    details: ['100% Nylon Shell', 'Thermal Lining', 'Reflective Accents', 'Oversized Fit'],
    shipping: 'Free worldwide shipping. Orders ship within 24 hours.',
    colors: [
      { name: 'Midnight Black', class: 'bg-black', imageIndex: 0 },
      { name: 'Espresso Brown', class: 'bg-[#4B3621]', imageIndex: 1 }, // Changed from Silver
      { name: 'Oxblood Red', class: 'bg-[#800020]', imageIndex: 2 }, // Changed from Green
      { name: 'Heather Grey', class: 'bg-[#9CA3AF]', imageIndex: 3 }, // Changed from Red
    ],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: '2',
    name: 'Cyber-Void Dress',
    price: '$180.00',
    category: 'Streetwear',
    images: [
      '/products/2/photo_2025-12-20_03-35-07.webp',
      '/products/2/photo_2025-12-20_03-41-03.webp',
      '/products/2/photo_2025-12-20_03-41-06.webp',
      '/products/2/photo_2025-12-20_03-41-08.webp',
      '/products/2/photo_2025-12-20_03-41-12.webp',
    ],
    description:
      'Ethereal silk-blend dress with asymmetric draping and digital print textures. A statement piece that blurs the line between physical and digital fashion.',
    details: ['90% Silk, 10% Elastane', 'Asymmetric Hem', 'Digital Print', 'Dry Clean Only'],
    shipping: 'Free worldwide shipping. Orders ship within 24 hours.',
    colors: [
      { name: 'Burgundy', class: 'bg-[#800020]', imageIndex: 0 }, // Changed from Black
      { name: 'Ice Blue', class: 'bg-[#A5F3FC]', imageIndex: 1 }, // Changed from Blue
      { name: 'Deep Teal', class: 'bg-[#0F766E]', imageIndex: 2 }, // Changed from White
      { name: 'Cocoa', class: 'bg-[#5D4037]', imageIndex: 3 }, // Changed from Red
      { name: 'Soft Pink', class: 'bg-[#FBCFE8]', imageIndex: 4 }, // Changed from Purple
    ],
    sizes: ['XS', 'S', 'M', 'L'],
  },
  {
    id: '3',
    name: 'Quantum Knit',
    price: '$120.00',
    category: 'Tops',
    images: [
      '/products/3/Gemini_Generated_Image_gk30bngk30bngk30.webp',
      '/products/3/Gemini_Generated_Image_mc72ghmc72ghmc72.webp',
      '/products/3/Gemini_Generated_Image_zfizygzfizygzfiz.webp',
      '/products/3/c76c0e1f1867ceaf2744c86cfeea53b3.webp',
    ],
    description:
      'Engineered knitwear with algorithmic patterns. Breathable, distinct, and incredibly soft against the skin.',
    details: [
      '100% Merino Wool',
      'Seamless Construction',
      'Algorithmic Pattern',
      'Machine Washable',
    ],
    shipping: 'Free worldwide shipping. Orders ship within 24 hours.',
    colors: [
      { name: 'Algorithm Grey', class: 'bg-gray-500', imageIndex: 0 },
      { name: 'Code White', class: 'bg-white border border-gray-200', imageIndex: 1 },
      { name: 'Binary Beige', class: 'bg-orange-100', imageIndex: 2 },
      { name: 'Terminal Green', class: 'bg-green-800', imageIndex: 3 },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: '4',
    name: 'Stealth Cargo',
    price: '$160.00',
    category: 'Bottoms',
    images: [
      '/products/4/photo_2025-12-20_04-28-13.webp',
      '/products/4/photo_2025-12-20_04-28-18.webp',
      '/products/4/photo_2025-12-20_04-28-21.webp',
      '/products/4/photo_2025-12-20_04-28-24.webp',
    ],
    description:
      'Modular cargo pants with concealed pockets and articulated knees. Built for movement and adaptability in any environment.',
    details: ['Technical Cotton Blend', 'Water Resistant', '8 Pockets', 'Tapered Fit'],
    shipping: 'Free worldwide shipping. Orders ship within 24 hours.',
    colors: [
      { name: 'Stealth Black', class: 'bg-black', imageIndex: 0 },
      { name: 'Olive Drab', class: 'bg-green-900', imageIndex: 1 },
      { name: 'Desert Tan', class: 'bg-[#D2B48C]', imageIndex: 2 },
      { name: 'Urban Grey', class: 'bg-gray-600', imageIndex: 3 },
    ],
    sizes: ['30', '32', '34', '36'],
  },
];
