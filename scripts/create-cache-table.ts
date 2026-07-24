/**
 * Manually create the CacheEntry table using raw SQL.
 * This bypasses interactive prompts or drift checks from Prisma CLI.
 *
 * Usage:  npx tsx scripts/create-cache-table.ts
 */
import { PrismaClient } from '../src/generated/client';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('Creating CacheEntry table if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CacheEntry" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("key")
      );
    `);
    console.log('✅ CacheEntry table created/verified successfully!');
  } catch (err) {
    console.error('Failed to create CacheEntry table:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
