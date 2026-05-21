import 'dotenv/config';
import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@localbrand.com' },
    update: { passwordHash },
    create: {
      email: 'admin@localbrand.com',
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin created:', admin.email, admin.role);

  const verify = await prisma.user.findUnique({ where: { email: 'admin@localbrand.com' } });
  console.log('✅ Verified:', verify?.email, 'Password hash exists:', !!verify?.passwordHash);
}

main().finally(() => prisma.$disconnect());
