import { prisma } from './src/utils/prisma.js';
async function main() {
  await prisma.$executeRawUnsafe(`UPDATE invite_tokens SET role = 'TECHNICIAN' WHERE role = 'WORKSHOP_MANAGER'`);
  console.log('InviteTokens updated successfully.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
