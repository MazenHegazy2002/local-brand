import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Production-style seed:
 * - Creates the 20 standard product categories so the catalog is browsable.
 * - Creates 3 starter accounts (admin / seller / buyer) with known passwords
 *   so the platform is usable on first boot.
 * - Does NOT create any sample products, orders, balances, loyalty points, or
 *   reviews — every business metric starts at zero. Real data is added by
 *   real sellers via the seller hub.
 */

async function main() {
  console.log('🌱 Seeding Brandy database (zero-data mode)...');

  // ── Clean up first ───────────────────────────────────────────────────────
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

  // ── Categories (catalog scaffolding) ──────────────────────────────────────
  const categoriesData = [
    { name: 'Women',       slug: 'women' },
    { name: 'Men',         slug: 'men' },
    { name: 'Kids',        slug: 'kids' },
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Home',        slug: 'home' },
    { name: 'Beauty',      slug: 'beauty' },
    { name: 'Sports',      slug: 'sports' },
    { name: 'Footwear',    slug: 'footwear' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Toys',        slug: 'toys' },
    { name: 'Appliances',  slug: 'appliances' },
    { name: 'Groceries',   slug: 'groceries' },
    { name: 'Auto',        slug: 'auto' },
    { name: 'Furniture',   slug: 'furniture' },
    { name: 'Books',       slug: 'books' },
    { name: 'Health',      slug: 'health' },
    { name: 'Pets',        slug: 'pets' },
    { name: 'Jewelry',     slug: 'jewelry' },
    { name: 'Garden',      slug: 'garden' },
    { name: 'Pharma',      slug: 'pharma' },
  ];

  await Promise.all(
    categoriesData.map((c) => prisma.category.create({ data: c })),
  );
  console.log(`✅ ${categoriesData.length} categories created`);

  // ── Users ───────────────────────────────────────────────────────────────
  // Loyalty points, balances and counters all start at zero.
  const adminPwHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@admin.com',
      passwordHash: adminPwHash,
      role: 'ADMIN',
      loyaltyPoints: 0,
    },
  });

  const sellerPwHash = await bcrypt.hash('seller1234', 10);
  const sellerUser = await prisma.user.create({
    data: {
      name: 'Demo Seller',
      email: 'seller@seller.com',
      passwordHash: sellerPwHash,
      role: 'SELLER',
      loyaltyPoints: 0,
    },
  });
  await prisma.sellerProfile.create({
    data: {
      userId: sellerUser.id,
      storeName: 'Demo Store',
      description: '',
      status: 'ACTIVE',
      balance: 0,
      commissionRate: 0.15,
    },
  });

  const buyerPwHash = await bcrypt.hash('user1234', 10);
  await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'user@user.com',
      passwordHash: buyerPwHash,
      role: 'BUYER',
      loyaltyPoints: 0,
    },
  });

  console.log('✅ Starter accounts created (admin / seller / buyer)');
  console.log('   No sample products, orders, points, balances or reviews — start clean.');

  console.log('\n🎉 Seeding complete!');
  console.log('Login credentials:');
  console.log('  Admin:  admin@admin.com / admin1234   → /admin-os');
  console.log('  Seller: seller@seller.com / seller1234 → /seller-hub');
  console.log('  Buyer:  user@user.com / user1234      → /dashboard');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
