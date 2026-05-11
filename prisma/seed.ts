import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up first
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
  await prisma.passwordResetToken.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // Create categories
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
  
  const categories = await Promise.all(
    categoriesData.map(c => prisma.category.create({ data: c }))
  );
  console.log('✅ Categories created');

  // Create Admin user
  const adminPwHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.create({
    data: { name: 'Admin Hana', email: 'admin@admin.com', passwordHash: adminPwHash, role: 'ADMIN' }
  });

  // Create Seller user
  const sellerPwHash = await bcrypt.hash('seller1234', 10);
  const sellerUser = await prisma.user.create({
    data: { name: 'Kareem Tech', email: 'seller@seller.com', passwordHash: sellerPwHash, role: 'SELLER' }
  });
  const sellerProfile = await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: 'TechStore EG',
      description: 'Premium electronics and accessories',
      status: 'ACTIVE',
      balance: 32640,
      commissionRate: 0.15,
    }
  });

  // Create Buyer user
  const buyerPwHash = await bcrypt.hash('user1234', 10);
  const buyerUser = await prisma.user.create({
    data: {
      name: 'Mazen Ahmed',
      email: 'user@user.com',
      passwordHash: buyerPwHash,
      role: 'BUYER',
      loyaltyPoints: 1240,
    }
  });
  await prisma.address.create({
    data: {
      userId: buyerUser.id,
      street: '12 El Nasr St',
      city: 'New Cairo',
      governorate: 'Cairo',
      isDefault: true,
    }
  });
  console.log('✅ Users created');

  // Create Tags and Collections
  const tagsData = ['New', 'Sale', 'Bestseller', 'Limited Edition', 'Eco-friendly'];
  const collectionsData = [
    { name: 'Summer 2026', slug: 'summer-2026' },
    { name: 'Essentials', slug: 'essentials' },
    { name: 'Luxury', slug: 'luxury' }
  ];

  const dbTags = await Promise.all(
    tagsData.map(t => prisma.tag.create({ data: { name: t, slug: t.toLowerCase().replace(' ', '-') } }))
  );
  const dbCols = await Promise.all(
    collectionsData.map(c => prisma.collection.create({ data: c }))
  );
  console.log('✅ Tags and Collections created');

  // Create 10 products per category
  for (const category of categories) {
    for (let i = 1; i <= 10; i++) {
      const pName = `${category.name} Product ${i}`;
      const product = await prisma.product.create({
        data: {
          title: pName,
          slug: `${category.slug}-product-${i}`,
          description: `This is a high quality ${pName}. Perfect for your everyday needs.`,
          basePrice: Math.floor(Math.random() * 5000) + 100,
          sellerId: sellerProfile.id,
          categoryId: category.id,
          isFeatured: i <= 2,
          published: true,
          tags: {
            connect: [{ id: dbTags[i % dbTags.length].id }]
          },
          collections: {
            connect: [{ id: dbCols[i % dbCols.length].id }]
          }
        }
      });

      await prisma.productImage.create({
        data: { productId: product.id, url: `https://picsum.photos/seed/${product.id}/600/600`, isPrimary: true }
      });

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `SKU-${product.id.slice(0, 6).toUpperCase()}`,
          title: 'Default',
          attributes: JSON.stringify({ color: 'Default' }),
          price: product.basePrice,
          stockCount: 50,
        }
      });
    }
  }
  console.log('✅ 60 Products created (10 per category)');

  console.log('\n🎉 Seeding complete!');
  console.log('Login credentials:');
  console.log('  Admin:  admin@admin.com / admin1234  → /admin-os');
  console.log('  Seller: seller@seller.com / seller1234 → /seller-hub');
  console.log('  Buyer:  user@user.com / user1234  → /dashboard');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
