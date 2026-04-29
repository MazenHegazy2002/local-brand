require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'ali@localbrand.com' } });
  if (!user) {
    console.log('User NOT FOUND');
  } else {
    console.log('User found:', user.email, user.role);
    console.log('Has password:', !!user.passwordHash);
    console.log('deletedAt:', user.deletedAt);
    console.log('passwordHash:', user.passwordHash ? user.passwordHash.substring(0, 30) + '...' : 'NULL');
    
    if (user.passwordHash) {
      const valid = await bcrypt.compare('password123', user.passwordHash);
      console.log('Password valid:', valid);
    }
  }
}

main().finally(() => prisma.$disconnect());