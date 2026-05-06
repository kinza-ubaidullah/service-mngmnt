import { prisma } from '../src/utils/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash('workshop123', salt);

  const user = await prisma.user.upsert({
    where: { phone: '1112223334' },
    update: {
      email: 'workshop@example.com',
      password_hash,
      is_active: true,
      role: 'WORKSHOP_MANAGER'
    },
    create: {
      name: 'Workshop Manager',
      email: 'workshop@example.com',
      phone: '1112223334',
      password_hash,
      role: 'WORKSHOP_MANAGER',
      is_active: true
    }
  });

  console.log('Workshop Manager created/updated:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
