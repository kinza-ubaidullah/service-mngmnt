import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function test() {
  try {
    const role = 'CALL_CENTER';
    const token = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date();
    expires_at.setFullYear(expires_at.getFullYear() + 100);

    const invite = await prisma.inviteToken.create({
      data: { token, role: role as any, expires_at }
    });

    console.log('Invite created successfully:', invite);
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
