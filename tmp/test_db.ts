import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log('Database connected successfully.');
    console.log('Users in database:', users);
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
