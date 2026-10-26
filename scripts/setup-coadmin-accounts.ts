import 'dotenv/config';
import { PrismaClient, Role } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const accounts = [
  {
    name: 'Mazen',
    email: 'mazen@brandyy.shop',
    password: 'Mazenhegazy2004',
    role: Role.ADMIN,
  },
  {
    name: 'Ali',
    email: 'ali@brandyy.shop',
    password: 'Ali312',
    role: Role.CO_ADMIN,
  },
  {
    name: 'Abdelrahman',
    email: 'abdelrahman@brandyy.shop',
    password: 'Abdelrhman99',
    role: Role.CO_ADMIN,
  },
  {
    name: 'Darwish',
    email: 'darwish@brandyy.shop',
    password: 'Darwish211',
    role: Role.CO_ADMIN,
  },
];

async function applyToDb(url: string, label: string) {
  console.log(`\nConnecting to ${label}...`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url },
    },
  });

  try {
    for (const acc of accounts) {
      const passwordHash = await bcrypt.hash(acc.password, 12);
      const user = await prisma.user.upsert({
        where: { email: acc.email.toLowerCase().trim() },
        update: {
          name: acc.name,
          role: acc.role,
          passwordHash,
          emailVerified: new Date(),
          deletedAt: null,
        },
        create: {
          name: acc.name,
          email: acc.email.toLowerCase().trim(),
          role: acc.role,
          passwordHash,
          emailVerified: new Date(),
        },
      });
      console.log(`  ✅ [${label}] Set ${user.email} (${user.name}) -> Role: ${user.role}`);
    }
  } catch (err: any) {
    console.error(`  ❌ Failed to update ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const localDb = process.env.DATABASE_URL;
  const vpsDb = process.env.VPS_DATABASE_URL;

  if (vpsDb) {
    await applyToDb(vpsDb, 'VPS Database');
  }

  if (localDb && localDb !== vpsDb) {
    await applyToDb(localDb, 'Local Database');
  }
}

main().catch(console.error);
