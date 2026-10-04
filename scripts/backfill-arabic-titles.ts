// Usage: npx tsx scripts/backfill-arabic-titles.ts
import { PrismaClient } from '@prisma/client';
import { translateToArabic } from '../src/lib/translate-ar';

const prisma = new PrismaClient();
(async () => {
  const products = await prisma.product.findMany({ where: { titleAr: null } });
  for (const p of products) {
    const ar = translateToArabic(p.title, p.description);
    if (!ar) {
      console.log('skip', p.title);
      continue;
    }
    await prisma.product.update({ where: { id: p.id }, data: ar });
    console.log(p.title, '→', ar.titleAr);
  }
  await prisma.$disconnect();
})();
