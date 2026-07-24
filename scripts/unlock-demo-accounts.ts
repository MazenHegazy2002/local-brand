/**
 * Clear Redis lockout keys for demo accounts AND verify
 * they exist in the DB with valid password hashes.
 *
 * Usage:  npx tsx scripts/unlock-demo-accounts.ts
 */
import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';
import { Redis } from '@upstash/redis';

const BCRYPT_COST = 12;

const DEMO_ACCOUNTS = [
  { email: 'admin@admin.com', password: 'admin1234' },
  { email: 'seller@seller.com', password: 'seller1234' },
  { email: 'user@user.com', password: 'user1234' },
  { email: 'affiliate@demo.com', password: 'affiliate1234' },
];

async function main() {
  const prisma = new PrismaClient();

  // Connect to Redis to clear lockout keys
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  let redis: Redis | null = null;
  if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
    console.log('Connected to Redis\n');
  } else {
    console.log('⚠️  No Redis credentials found — skipping lockout clear\n');
  }

  try {
    for (const account of DEMO_ACCOUNTS) {
      // 1. Check if user exists in DB
      const user = await prisma.user.findUnique({
        where: { email: account.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          deletedAt: true,
          emailVerified: true,
        },
      });

      if (!user) {
        console.log(`❌ ${account.email} — NOT FOUND in database`);
        continue;
      }

      console.log(`📧 ${account.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Deleted: ${user.deletedAt ? 'YES ⚠️' : 'No ✅'}`);
      console.log(`   Email Verified: ${user.emailVerified ? 'Yes ✅' : 'No ⚠️'}`);
      console.log(`   Has passwordHash: ${user.passwordHash ? 'Yes' : 'NO ❌'}`);

      // 2. Verify if current password matches
      if (user.passwordHash) {
        const matches = await bcrypt.compare(account.password, user.passwordHash);
        console.log(
          `   Password "${account.password}" matches: ${matches ? '✅ YES' : '❌ NO — resetting...'}`
        );

        if (!matches) {
          const newHash = await bcrypt.hash(account.password, BCRYPT_COST);
          await prisma.user.update({
            where: { email: account.email },
            data: { passwordHash: newHash },
          });
          console.log(`   ✅ Password reset done`);
        }
      } else {
        // No password hash at all — set one
        const newHash = await bcrypt.hash(account.password, BCRYPT_COST);
        await prisma.user.update({
          where: { email: account.email },
          data: { passwordHash: newHash },
        });
        console.log(`   ✅ Password hash created`);
      }

      // 3. Fix deletedAt if set
      if (user.deletedAt) {
        await prisma.user.update({
          where: { email: account.email },
          data: { deletedAt: null },
        });
        console.log(`   ✅ Undeleted account`);
      }

      // 4. Fix emailVerified if null
      if (!user.emailVerified) {
        await prisma.user.update({
          where: { email: account.email },
          data: { emailVerified: new Date() },
        });
        console.log(`   ✅ Email marked as verified`);
      }

      // 5. Clear Redis lockout keys
      if (redis) {
        const emailKey = `login:limit:email:${account.email}`;
        await redis.del(emailKey);
        console.log(`   ✅ Redis lockout key cleared`);
      }

      console.log('');
    }

    // Also clear any IP-based lockouts
    if (redis) {
      // Scan for any login:limit:ip keys and clear them
      let cursor = '0';
      let cleared = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: 'login:limit:ip:*',
          count: 100,
        });
        cursor = String(nextCursor);
        if (keys.length > 0) {
          for (const key of keys) {
            await redis.del(key as string);
            cleared++;
          }
        }
      } while (cursor !== '0');
      console.log(`🔓 Cleared ${cleared} IP-based lockout key(s) from Redis`);
    }

    console.log('\n✅ All demo accounts are ready to use!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
