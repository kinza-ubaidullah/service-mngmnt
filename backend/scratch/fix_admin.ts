import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('admin123', salt);

  const user = await prisma.user.upsert({
    where: { phone: '0000000000' },
    update: {
      email: 'admin@example.com',
      password_hash,
      is_active: true
    },
    create: {
      name: 'Super Admin',
      email: 'admin@example.com',
      phone: '0000000000',
      password_hash,
      role: 'ADMIN',
      is_active: true
    }
  });

  console.log('User updated/created successfully:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
