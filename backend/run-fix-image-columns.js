const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const p = new PrismaClient();
const sql = fs.readFileSync(process.argv[2] || 'fix-image-columns.sql', 'utf8');
const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);

(async () => {
  for (const s of stmts) {
    try {
      await p.$executeRawUnsafe(s);
      console.log('OK:', s.slice(0, 60));
    } catch (e) {
      console.error('ERR:', e.message);
    }
  }
  await p.$disconnect();
})();
