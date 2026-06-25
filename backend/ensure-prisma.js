'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function prismaClientReady() {
  const clientDir = path.join(__dirname, 'node_modules', '.prisma', 'client');
  if (!fs.existsSync(clientDir)) return false;

  const files = fs.readdirSync(clientDir);
  const hasEngine = files.some(
    (f) => f.startsWith('libquery_engine') || f.endsWith('query_engine-windows.dll.node')
  );
  if (!hasEngine) return false;

  try {
    const { PrismaClient } = require('@prisma/client');
    const test = new PrismaClient();
    if (typeof test.$connect !== 'function') return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = function ensurePrisma() {
  if (prismaClientReady()) {
    console.log('Prisma client ready');
    return;
  }

  const schema = path.join(__dirname, 'prisma', 'schema.prisma');
  if (!fs.existsSync(schema)) {
    throw new Error('prisma/schema.prisma missing — upload prisma folder');
  }

  const prismaCli = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaCli)) {
    throw new Error('prisma package missing — Run NPM Install in cPanel');
  }

  console.log('Prisma client not initialized — running generate...');
  execFileSync(process.execPath, [prismaCli, 'generate'], {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit',
    timeout: 300000,
  });

  if (!prismaClientReady()) {
    throw new Error(
      'prisma generate failed on server. Upload backend-prisma-fix.zip (includes pre-built client).'
    );
  }
  console.log('Prisma client generated OK');
};
