import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing demo data...');

  // Delete in order of dependencies
  await prisma.review.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.sellerProfile.deleteMany({});
  
  // Clear categories/tags/collections too if they are "demo"
  await prisma.tag.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.category.deleteMany({});

  // Keep Admin user, delete others
  const adminEmail = 'mazen@example.com';
  await prisma.user.deleteMany({
    where: {
      email: {
        not: adminEmail
      }
    }
  });

  console.log('Demo data cleared successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
