import { createServer } from 'http';
import { buildApp, attachSocket } from './app';

async function startServer() {
  // Auto-run Prisma client checks and DB migrations on startup (fully aligned with production)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ensurePrisma = require('../ensure-prisma.js');
    ensurePrisma();
  } catch (err: any) {
    console.warn('[startup] Prisma check skipped/failed:', err.message);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const autoMigrate = require('../auto-migrate.js');
    await autoMigrate();
    console.log('[startup] Database auto-migration completed successfully');
  } catch (err: any) {
    console.warn('[startup] Database auto-migration warning (non-fatal):', err.message);
  }

  const app = buildApp();
  const server = createServer(app);
  const PORT = process.env.PORT || 5000;
  const disableSocket = process.env.DISABLE_SOCKET === '1';

  if (!disableSocket) {
    attachSocket(server);
  } else {
    console.log('Socket.io disabled (DISABLE_SOCKET=1)');
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}${disableSocket ? ' (no socket)' : ' with WebSockets'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
