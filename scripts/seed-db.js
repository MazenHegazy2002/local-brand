const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const testUsers = [
    { email: 'admin@localbrand.com', name: 'System Admin', role: 'ADMIN', pass: 'admin123' },
    { email: 'seller@localbrand.com', name: 'Elite Seller', role: 'SELLER', pass: 'seller123' },
    { email: 'buyer@localbrand.com', name: 'Frequent Buyer', role: 'BUYER', pass: 'buyer123' }
  ];

  for (const u of testUsers) {
    const hashedPassword = await bcrypt.hash(u.pass, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { 
        email: u.email, 
        name: u.name, 
        role: u.role, 
        passwordHash: hashedPassword 
      }
    });

    if (u.role === 'SELLER') {
      await prisma.sellerProfile.upsert({
        where: { userId: user.id },
        update: { status: 'ACTIVE' },
        create: { userId: user.id, storeName: "Elite Local Goods", status: 'ACTIVE' }
      });
    }
    console.log(`Initialized ${u.role}: ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
