import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ url: process.env.DATABASE_URL });

async function main() {
  // Clear existing records if needed or just upsert
  
  // 1. Create a default Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@example.com',
      phone: '1234567890',
      password_hash: adminPassword,
      role: 'ADMIN',
      is_active: true,
    },
  });
  
  console.log({ admin });
  
  // 2. Create some sample teams
  const team1 = await prisma.team.create({
    data: {
      name: 'North Region Team',
      contact: '9876543210',
      payment_model: { type: 'commission', rate: 0.15 },
    },
  });
  
  const team2 = await prisma.team.create({
    data: {
      name: 'South Region Team',
      contact: '1122334455',
      payment_model: { type: 'fixed', rate: 1000 },
    },
  });
  
  console.log({ team1, team2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
