const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USER DATABASE IDs ---');
  users.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Role: ${u.role}`);
  });
  console.log('-------------------------');
}

main().finally(() => prisma.$disconnect());
