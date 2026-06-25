import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import type { Server as HttpServer } from 'http';
import { setSocketServer, emitTechLocationChanged } from './utils/broadcast';

dotenv.config();

type RouteMount = [string, string[]];

const ROUTE_MOUNTS: RouteMount[] = [
  ['./routes/auth.routes', ['/api/auth', '/auth']],
  ['./routes/lead.routes', ['/api/leads', '/leads']],
  ['./routes/user.routes', ['/api/users', '/users']],
  ['./routes/dashboard.routes', ['/api/dashboard', '/dashboard']],
  ['./routes/expense.routes', ['/api/expenses', '/expenses']],
  ['./routes/financial.routes', ['/api/finance', '/finance']],
  ['./routes/customFields.routes', ['/api/finance/custom-fields', '/finance/custom-fields']],
  ['./routes/workshop.routes', ['/api/workshop', '/workshop']],
  ['./routes/area.routes', ['/api/areas', '/areas']],
  ['./routes/system.routes', ['/api/system', '/system']],
  ['./routes/settlement.routes', ['/api/settlements', '/settlements']],
  ['./routes/post.routes', ['/api/posts', '/posts']],
  ['./routes/team.routes', ['/api/teams', '/teams']],
];

function applyCoreMiddleware(app: Express) {
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', message: 'Server is healthy' });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  const allowedOrigins = [
    'http://localhost:5173',
    'https://crm.aljaroshi.com',
    'https://www.crm.aljaroshi.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin) || true);
    },
    credentials: true,
  }));
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

function mountRoutesSync(app: Express) {
  for (const [modulePath, paths] of ROUTE_MOUNTS) {
    const routes = require(modulePath).default;
    app.use(paths, routes);
  }
  console.log('API routes registered');
}

function mountRoutesAsync(app: Express, onDone: () => void) {
  let index = 0;

  const step = () => {
    if (index >= ROUTE_MOUNTS.length) {
      console.log('API routes registered (async)');
      onDone();
      return;
    }
    const [modulePath, paths] = ROUTE_MOUNTS[index++];
    const routes = require(modulePath).default;
    app.use(paths, routes);
    setImmediate(step);
  };

  setImmediate(step);
}

export function buildApp(): Express {
  const app = express();
  applyCoreMiddleware(app);
  mountRoutesSync(app);
  return app;
}

/** cPanel: returns app immediately; routes load without blocking /health */
export function buildAppAsync(onReady: () => void): Express {
  const app = express();
  applyCoreMiddleware(app);
  mountRoutesAsync(app, onReady);
  return app;
}

export function attachSocket(server: HttpServer) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Server } = require('socket.io') as typeof import('socket.io');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require('./utils/prisma') as typeof import('./utils/prisma');

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  setSocketServer(io);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_room', (roomName: string) => {
      socket.join(roomName);
    });

    socket.on('location_update', async (data: { userId: number; lat: number; lng: number }) => {
      const { userId, lat, lng } = data;
      try {
        await prisma.user.update({
          where: { id: Number(userId) },
          data: { lat: Number(lat), lng: Number(lng) },
        });
        emitTechLocationChanged(userId, lat, lng);
      } catch (error) {
        console.error(`Failed to update socket location for user ${userId}:`, error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
