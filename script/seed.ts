import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'mazen@example.com' },
    update: {
      name: 'Mazen',
      role: 'ADMIN',
      passwordHash,
    },
    create: {
      email: 'mazen@example.com',
      name: 'Mazen',
      role: 'ADMIN',
      passwordHash,
    },
  });

  // Buyer
  await prisma.user.upsert({
    where: { email: 'mazen2@example.com' },
    update: {
      name: 'mazen2',
      role: 'BUYER',
      passwordHash,
    },
    create: {
      email: 'mazen2@example.com',
      name: 'mazen2',
      role: 'BUYER',
      passwordHash,
    },
  });

  // Seller
  const sellerUser = await prisma.user.upsert({
    where: { email: 'ali@example.com' },
    update: {
      name: 'Ali',
      role: 'SELLER',
      passwordHash,
    },
    create: {
      email: 'ali@example.com',
      name: 'Ali',
      role: 'SELLER',
      passwordHash,
    },
  });

  // Create Seller Profile for Ali
  await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {
      storeName: "Ali's Store",
      status: 'ACTIVE',
    },
    create: {
      userId: sellerUser.id,
      storeName: "Ali's Store",
      status: 'ACTIVE',
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
