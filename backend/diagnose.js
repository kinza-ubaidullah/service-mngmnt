'use strict';
/**
 * diagnose.js — Run this on cPanel to check what's broken.
 * Upload this file alongside server.js, then check the output in cPanel app logs.
 * 
 * Usage: node diagnose.js
 */

const http = require('http');
const { execSync } = require('child_process');

console.log('\n========== PRODUCTION DIAGNOSTICS ==========');
console.log('Time:', new Date().toISOString());
console.log('Node:', process.version);
console.log('CWD:', process.cwd());

// Check env vars (masked)
console.log('\n── ENV VARS ──');
const vars = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'FRONTEND_URL'];
for (const v of vars) {
  const val = process.env[v];
  if (!val) {
    console.log(`  ${v}: ❌ NOT SET`);
  } else {
    const masked = val.length > 8 ? val.substring(0, 4) + '****' + val.slice(-4) : '****';
    console.log(`  ${v}: ✅ SET (${masked})`);
  }
}

// Check critical files
console.log('\n── FILES ──');
const fs = require('fs');
const path = require('path');
const files = ['server.js', 'ensure-prisma.js', 'auto-migrate.js', 'dist/app.js', 'prisma/schema.prisma', 'package.json'];
for (const f of files) {
  const exists = fs.existsSync(path.join(__dirname, f));
  console.log(`  ${f}: ${exists ? '✅ exists' : '❌ MISSING'}`);
}

// Check node_modules
console.log('\n── PACKAGES ──');
const pkgs = ['@prisma/client', 'express', 'bcryptjs', 'jsonwebtoken', 'nodemailer', 'resend'];
for (const pkg of pkgs) {
  try {
    const pkgJson = require(path.join(__dirname, 'node_modules', pkg, 'package.json'));
    console.log(`  ${pkg}: ✅ v${pkgJson.version}`);
  } catch {
    console.log(`  ${pkg}: ❌ NOT INSTALLED — run npm install`);
  }
}

// Check Prisma client binary
console.log('\n── PRISMA CLIENT ──');
const prismaClientDir = path.join(__dirname, 'node_modules', '.prisma', 'client');
if (fs.existsSync(prismaClientDir)) {
  const files2 = fs.readdirSync(prismaClientDir);
  const engine = files2.find(f => f.startsWith('libquery_engine') || f.includes('query_engine'));
  console.log(`  Client dir: ✅ exists`);
  console.log(`  Engine binary: ${engine ? '✅ ' + engine : '❌ NOT FOUND — prisma generate needed'}`);
} else {
  console.log('  Prisma client dir: ❌ MISSING — run prisma generate');
}

// Test database connection
console.log('\n── DATABASE ──');
async function testDb() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1+1 AS result`;
    console.log('  Connection: ✅ Connected');
    
    // Check if key tables exist
    const tables = ['users', 'password_reset_otps'];
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`SELECT 1 FROM \`${table}\` LIMIT 1`);
        console.log(`  Table ${table}: ✅ exists`);
      } catch (e) {
        console.log(`  Table ${table}: ❌ MISSING or error:`, e.message.substring(0, 80));
      }
    }
    
    // Check users with 2FA enabled (potentially locked out)
    const locked = await prisma.user.findMany({
      where: { totp_enabled: true },
      select: { id: true, name: true, email: true, role: true }
    });
    if (locked.length > 0) {
      console.log('\n  ⚠️  Users with 2FA ENABLED (may be locked out):');
      for (const u of locked) {
        console.log(`     ID:${u.id} ${u.name} (${u.role}) — ${u.email}`);
      }
      console.log('  → To unlock: run disable-2fa.sql in phpMyAdmin');
    } else {
      console.log('  Users with 2FA: none locked');
    }
    
    await prisma.$disconnect();
  } catch (e) {
    console.log('  Connection: ❌ FAILED —', e.message.substring(0, 200));
  }
}

testDb().then(() => {
  console.log('\n========== DONE ==========\n');
}).catch(e => {
  console.error('Diagnostics error:', e);
});
