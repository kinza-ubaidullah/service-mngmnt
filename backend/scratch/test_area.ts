import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const name = 'Test Area ' + Date.now();
    console.log('Inserting area:', name);
    const newArea = await prisma.area.create({ data: { name } });
    console.log('Success:', newArea);
    
    console.log('Fetching all areas...');
    const areas = await prisma.area.findMany();
    console.log('Areas:', areas);
  } catch (e) {
    console.error('Prisma Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
