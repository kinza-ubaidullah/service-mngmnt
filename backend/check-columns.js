const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SHOW COLUMNS FROM leads WHERE Field IN ('house_image','product_image')`
  .then(r => console.log('lead images:', r))
  .catch(e => console.error(e.message))
  .finally(() => p.$disconnect());
