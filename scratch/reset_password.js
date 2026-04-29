const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require(path.join(__dirname, '../src/generated/client'));
const prisma = new PrismaClient();

async function reset() {
  try {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { email: 'ali@localbrand.com' },
      data: { passwordHash: hash }
    });
    console.log('RESULT: Password reset to "password123" for ' + user.email);
  } catch (e) {
    console.log('ERROR:' + e.message);
  }
  process.exit(0);
}
reset();
