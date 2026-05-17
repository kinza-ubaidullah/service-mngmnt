import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching users to update legacy passwords...');
  const users = await prisma.user.findMany();
  
  let updatedCount = 0;
  for (const user of users) {
    if (!user.plain_password) {
      let defaultPassword = '';
      if (user.role === 'ADMIN') {
        defaultPassword = 'admin123';
      } else if (user.role === 'CALL_CENTER') {
        defaultPassword = 'agent123';
      } else {
        defaultPassword = 'tech123';
      }
      
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(defaultPassword, salt);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plain_password: defaultPassword,
          password_hash: password_hash
        }
      });
      
      console.log(`Updated legacy user: [${user.role}] ${user.name} (${user.email || user.phone}) -> Password: ${defaultPassword}`);
      updatedCount++;
    }
  }
  
  console.log(`Success! Updated ${updatedCount} legacy users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
