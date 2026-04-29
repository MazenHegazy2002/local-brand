const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require(path.join(__dirname, '../src/generated/client'));
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'ali@localbrand.com' }
    });
    console.log('DB HASH:' + user.passwordHash);
    
    const testHash = await bcrypt.hash('password123', 10);
    console.log('TEST HASH:' + testHash);
    
    const compare = await bcrypt.compare('password123', user.passwordHash);
    console.log('COMPARE RESULT:' + compare);
    
  } catch (e) {
    console.log('ERROR:' + e.message);
  }
  process.exit(0);
}
check();
