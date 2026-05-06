import { prisma } from '../src/utils/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USER LIST ---');
  users.forEach(u => {
    console.log(`[${u.role}] ${u.name} | Email: ${u.email} | Phone: ${u.phone} | Active: ${u.is_active}`);
  });
  console.log('-----------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
