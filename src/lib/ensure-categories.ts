import { prisma } from '@/lib/prisma';

export const CORE_CATEGORIES = [
  { name: 'Women', nameAr: 'نساء', slug: 'women' },
  { name: 'Men', nameAr: 'رجال', slug: 'men' },
  { name: 'Kids', nameAr: 'أطفال', slug: 'kids' },
  { name: 'Electronics', nameAr: 'إلكترونيات', slug: 'electronics' },
  { name: 'Entertainment', nameAr: 'ترفيه', slug: 'entertainment' },
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

let categoriesSynced = false;

/**
 * Ensures all core categories (including Entertainment) exist in the PostgreSQL database.
 * Runs idempotently on first server access or DB read.
 */
export async function ensureCoreCategories() {
  if (categoriesSynced) return;
  try {
    const existingSlugs = new Set(
      (await prisma.category.findMany({ select: { slug: true } })).map(c => c.slug)
    );

    const missing = CORE_CATEGORIES.filter(c => !existingSlugs.has(c.slug));

    if (missing.length > 0) {
      await Promise.all(
        missing.map(c =>
          prisma.category.upsert({
            where: { slug: c.slug },
            update: { name: c.name, nameAr: c.nameAr },
            create: { name: c.name, nameAr: c.nameAr, slug: c.slug },
          })
        )
      );
    }
    categoriesSynced = true;
  } catch (error) {
    console.error('Error ensuring core categories:', error);
  }
}
