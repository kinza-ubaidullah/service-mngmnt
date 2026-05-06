const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('admin123', salt);

  const admin = await prisma.user.upsert({
    where: { phone: '0000000000' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@example.com',
      phone: '0000000000',
      password_hash,
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
