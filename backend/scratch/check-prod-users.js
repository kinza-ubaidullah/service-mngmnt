const { PrismaClient } = require('@prisma/client');

// Use production DATABASE_URL directly
const DATABASE_URL = process.argv[2];

if (!DATABASE_URL) {
  console.error('Usage: node scratch/check-prod-users.js "mysql://user:pass@host:3306/dbname"');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true }
    });
    console.log('Production Users:');
    users.forEach(u => {
      console.log(`  ID:${u.id} | ${u.role} | ${u.name} | email:${u.email || 'NULL'} | phone:${u.phone} | active:${u.is_active}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
