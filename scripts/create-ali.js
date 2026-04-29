require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  const ali = await prisma.user.upsert({
    where: { email: 'ali@localbrand.com' },
    update: { passwordHash: hash },
    create: { email: 'ali@localbrand.com', name: 'Ali', passwordHash: hash, role: 'SELLER' }
  });
  console.log('✅ Created:', ali.email, ali.role);
}

main().finally(() => prisma.$disconnect());