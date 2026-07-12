import { PrismaClient } from '../src/generated/client/index.js';
const p = new PrismaClient();
try {
  const pages = await p.page.findMany({ select: { slug: true, status: true, titleEn: true } });
  console.log(JSON.stringify(pages, null, 2));
  const cats = await p.category.findMany({
    select: { name: true, slug: true, _count: { select: { products: true } } },
  });
  console.log('CATEGORIES:', JSON.stringify(cats, null, 2));
} finally {
  await p.$disconnect();
}
