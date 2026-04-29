import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('password123', 10);
  const userPassword = await bcrypt.hash('passwprd123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@localbrand.com' },
    update: { passwordHash: adminPassword, role: 'ADMIN' },
    create: {
      email: 'admin@localbrand.com',
      name: 'Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'mazen@localbrand.com' },
    update: { passwordHash: userPassword, role: 'BUYER' },
    create: {
      email: 'mazen@localbrand.com',
      name: 'Mazen',
      passwordHash: userPassword,
      role: 'BUYER',
    },
  });

  console.log('Admin: admin@localbrand.com / password123');
  console.log('User: mazen@localbrand.com / passwprd123');
}

main().finally(() => prisma.$disconnect());