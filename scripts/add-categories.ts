import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

const categoriesData = [
  { name: 'Women', slug: 'women' },
  { name: 'Men', slug: 'men' },
  { name: 'Kids', slug: 'kids' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Home', slug: 'home' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Footwear', slug: 'footwear' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Toys', slug: 'toys' },
  { name: 'Appliances', slug: 'appliances' },
  { name: 'Groceries', slug: 'groceries' },
  { name: 'Auto', slug: 'auto' },
  { name: 'Furniture', slug: 'furniture' },
  { name: 'Books', slug: 'books' },
  { name: 'Health', slug: 'health' },
  { name: 'Pets', slug: 'pets' },
  { name: 'Jewelry', slug: 'jewelry' },
  { name: 'Garden', slug: 'garden' },
  { name: 'Pharma', slug: 'pharma' },
];

async function main() {
  for (const cat of categoriesData) {
    const existing = await prisma.category.findFirst({ where: { slug: cat.slug } });
    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Created: ${cat.name}`);
    } else {
      console.log(`⏭️  Exists: ${cat.name}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());