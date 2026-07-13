/**
 * One-off cleanup script — removes TestCategory (and any other test-named
 * categories with zero products) from the database before launch.
 * Run with: node --experimental-vm-modules scripts/remove-test-data.mjs
 */
import { PrismaClient } from '../src/generated/client/index.js';

const p = new PrismaClient();

try {
  // Find categories that look like test data: name starts with "test" (case-insensitive)
  const testCats = await p.category.findMany({
    where: {
      name: { in: ['TestCategory', 'testcategory', 'Test', 'test'] },
    },
    include: { _count: { select: { products: true } } },
  });

  if (testCats.length === 0) {
    console.log('✅ No test categories found — nothing to remove.');
  } else {
    for (const cat of testCats) {
      if (cat._count.products > 0) {
        console.warn(
          `⚠️  Skipping "${cat.name}" — has ${cat._count.products} products. Reassign them first.`
        );
        continue;
      }
      await p.category.delete({ where: { id: cat.id } });
      console.log(`🗑️  Deleted category "${cat.name}" (slug: ${cat.slug})`);
    }
  }

  console.log('\n✅ Cleanup complete.');
} catch (err) {
  console.error('❌ Error during cleanup:', err);
  process.exit(1);
} finally {
  await p.$disconnect();
}
