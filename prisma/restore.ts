import { PrismaClient } from '../src/generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const backupPath = path.join(process.cwd(), 'backup.json');

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at: ${backupPath}`);
    console.error('Please place your "backup.json" in the root directory first.');
    process.exit(1);
  }

  console.log('Reading backup data...');
  const rawData = fs.readFileSync(backupPath, 'utf8');
  const backup = JSON.parse(rawData);

  if (!backup.tables) {
    console.error('Invalid backup format. Must contain a "tables" object.');
    process.exit(1);
  }

  const { tables } = backup;

  console.log('🔄 Wiping existing database records safely...');

  // Safe cascading wipe order
  await prisma.dispute.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productQA.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.sellerProfile.deleteMany();
  await prisma.affiliate.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.page.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database wiped successfully. Restoring tables...');

  // Helper to safely restore a table
  const restoreTable = async (modelName: string, records: any[]) => {
    if (!records || records.length === 0) return;
    console.log(`Restoring ${records.length} records to ${modelName}...`);

    // Map dates back to Date objects from string serialization
    const parsedRecords = records.map(record => {
      const copy = { ...record };
      for (const key of Object.keys(copy)) {
        if (
          typeof copy[key] === 'string' &&
          (copy[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) ||
            key === 'createdAt' ||
            key === 'updatedAt' ||
            key === 'expiresAt' ||
            key === 'emailVerified' ||
            key === 'approvedAt' ||
            key === 'deliveredAt' ||
            key === 'confirmedAt')
        ) {
          copy[key] = new Date(copy[key]);
        }
      }
      return copy;
    });

    // Bulk create
    const model = (prisma as any)[modelName];
    if (model && typeof model.createMany === 'function') {
      await model.createMany({ data: parsedRecords });
    } else {
      // Fallback to sequential create if createMany is not available
      for (const record of parsedRecords) {
        await model.create({ data: record });
      }
    }
  };

  try {
    await restoreTable('user', tables.users?.records || []);
    await restoreTable('systemSettings', tables.systemSettings?.records || []);
    await restoreTable('page', tables.pages?.records || []);
    await restoreTable('affiliate', tables.affiliates?.records || tables.affiliate?.records || []);
    await restoreTable('sellerProfile', tables.sellerProfiles?.records || []);
    await restoreTable('category', tables.categories?.records || []);
    await restoreTable('tag', tables.tags?.records || []);
    await restoreTable('collection', tables.collections?.records || []);
    await restoreTable('product', tables.products?.records || []);
    await restoreTable('productVariant', tables.productVariants?.records || []);
    await restoreTable('productImage', tables.productImages?.records || []);
    await restoreTable('order', tables.orders?.records || []);
    await restoreTable('orderItem', tables.orderItems?.records || []);
    await restoreTable('review', tables.reviews?.records || []);
    await restoreTable('productQA', tables.productQAs?.records || []);
    await restoreTable('coupon', tables.coupons?.records || []);
    await restoreTable('dispute', tables.disputes?.records || []);

    console.log('🎉 Database fully restored successfully from backup.json!');
  } catch (error) {
    console.error('❌ Error during restoration:', error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
