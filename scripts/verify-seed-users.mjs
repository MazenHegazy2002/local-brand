/**
 * One-off database utility — pre-verifies the email addresses of the seeded test accounts
 * (admin, seller, buyer, affiliate) so that login is not blocked by the new email verification check.
 * Run with: node --experimental-vm-modules scripts/verify-seed-users.mjs
 */
import { PrismaClient } from '../src/generated/client/index.js';

const prisma = new PrismaClient();

const emailsToVerify = [
  'admin@admin.com',
  'seller@seller.com',
  'user@user.com',
  'affiliate@demo.com',
];

async function main() {
  try {
    const now = new Date();
    const result = await prisma.user.updateMany({
      where: {
        email: { in: emailsToVerify },
        emailVerified: null,
      },
      data: {
        emailVerified: now,
      },
    });

    console.log(
      `✅ Pre-verification complete. Marked ${result.count} starter accounts as verified.`
    );
  } catch (err) {
    console.error('❌ Error updating seed accounts:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
