
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixRoles() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (!user.role) {
      console.log(`Fixing user ${user.email} - role was missing`);
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' } // Defaulting to ADMIN for fix
      });
    } else {
      console.log(`User ${user.email} has role: ${user.role}`);
    }
  }
  await prisma.$disconnect();
}

fixRoles();
