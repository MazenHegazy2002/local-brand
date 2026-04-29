const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../src/generated/client'));
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'ali@localbrand.com' }
    });
    console.log('RESULT:' + JSON.stringify(user ? { email: user.email, hasHash: !!user.passwordHash, role: user.role } : 'Not found'));
  } catch (e) {
    console.log('ERROR:' + e.message);
  }
  process.exit(0);
}
check();
