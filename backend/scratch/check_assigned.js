const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: { assigned_to: { not: null } },
    select: { id: true, lead_id: true, status: true, assigned_to: true, technician: { select: { id: true, name: true, role: true } } }
  });
  console.log('Assigned leads:', leads);
}
main().catch(console.error).finally(() => prisma.$disconnect());
