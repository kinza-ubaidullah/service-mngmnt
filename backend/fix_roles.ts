import { prisma } from './src/utils/prisma.js';
async function main() {
  await prisma.$executeRawUnsafe(`UPDATE users SET role = 'TECHNICIAN' WHERE role = 'WORKSHOP_MANAGER'`);
  console.log('Users updated successfully.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
