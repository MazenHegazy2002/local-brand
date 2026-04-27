import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const emails = ['mazen@example.com', 'mazen2@example.com', 'ali@example.com'];
  const password = 'password123';
  
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`❌ NOT FOUND: ${email}`);
      continue;
    }
    const valid = await bcrypt.compare(password, user.passwordHash || '');
    console.log(`${valid ? '✅' : '❌'} ${email} | role=${user.role} | passwordValid=${valid} | deletedAt=${user.deletedAt}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
