/**
 * Reset demo account passwords on the production database.
 * This does NOT wipe any data — it only updates the passwordHash
 * for the 4 known demo accounts.
 *
 * Usage:  npx tsx scripts/reset-demo-passwords.ts
 */
import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

const DEMO_ACCOUNTS = [
  { email: 'admin@admin.com', password: 'admin1234' },
  { email: 'seller@seller.com', password: 'seller1234' },
  { email: 'user@user.com', password: 'user1234' },
  { email: 'affiliate@demo.com', password: 'affiliate1234' },
];

async function main() {
  const prisma = new PrismaClient();

  try {
    for (const account of DEMO_ACCOUNTS) {
      const hash = await bcrypt.hash(account.password, BCRYPT_COST);
      const result = await prisma.user.updateMany({
        where: { email: account.email },
        data: { passwordHash: hash },
      });

      if (result.count > 0) {
        console.log(`✅ ${account.email} — password reset to "${account.password}"`);
      } else {
        console.log(`⚠️  ${account.email} — account not found in database`);
      }
    }

    console.log('\nDone! All demo passwords have been reset.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
