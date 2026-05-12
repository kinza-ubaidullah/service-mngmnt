import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debug() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@example.com' }
  });

  if (!user) {
    console.log('User NOT found. Creating it now...');
    const password_hash = await bcrypt.hash('admin123', 10);
    const newUser = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@example.com',
        phone: '1234567890',
        password_hash,
        role: 'ADMIN',
        is_active: true,
      }
    });
    console.log('Admin user created successfully:', newUser.email);
  } else {
    console.log('User found:', user.email);
    console.log('Checking password "admin123"...');
    const isValid = await bcrypt.compare('admin123', user.password_hash);
    console.log('Password valid?', isValid);
    
    if (!isValid) {
      console.log('Updating password to "admin123"...');
      const password_hash = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash }
      });
      console.log('Password updated.');
    }
  }
}

debug()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
