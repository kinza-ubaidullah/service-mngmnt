import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { phone: '03009998877' },
    update: {},
    create: {
      name: 'Test Call Center',
      email: 'callcenter@test.com',
      phone: '03009998877',
      password_hash: password,
      role: 'CALL_CENTER',
      is_active: true
    }
  });

  console.log('Call Center User Created:', user);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
