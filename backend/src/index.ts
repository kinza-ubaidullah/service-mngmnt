import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { prisma } from './utils/prisma';
import { setSocketServer } from './utils/broadcast';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server and bind Socket.io
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
setSocketServer(io);

const allowedOrigins = [
  'http://localhost:5173',
  'https://crm.aljaroshi.com',
  'https://www.crm.aljaroshi.com',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // allow other subdomains in production
    }
  },
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
import authRoutes from './routes/auth.routes';
import leadRoutes from './routes/lead.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import expenseRoutes from './routes/expense.routes';
import financialRoutes from './routes/financial.routes';
import workshopRoutes from './routes/workshop.routes';
import areaRoutes from './routes/area.routes';
import systemRoutes from './routes/system.routes';
import customFieldsRoutes from './routes/customFields.routes';
import settlementRoutes from './routes/settlement.routes';
import postRoutes from './routes/post.routes';

// Support both prefixed and non-prefixed routes for maximum compatibility
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/leads', '/leads'], leadRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/expenses', '/expenses'], expenseRoutes);
app.use(['/api/finance', '/finance'], financialRoutes);
app.use(['/api/finance/custom-fields', '/finance/custom-fields'], customFieldsRoutes);
app.use(['/api/workshop', '/workshop'], workshopRoutes);
app.use(['/api/areas', '/areas'], areaRoutes);
app.use(['/api/system', '/system'], systemRoutes);
app.use(['/api/settlements', '/settlements'], settlementRoutes);
app.use(['/api/posts', '/posts'], postRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

// Socket.io Real-Time Location Updates Handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_room', (roomName: string) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('location_update', async (data: { userId: number; lat: number; lng: number }) => {
    const { userId, lat, lng } = data;
    console.log(`Location update from technician ${userId}: lat ${lat}, lng ${lng}`);

    try {
      // 1. Update database coordinates
      await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          lat: Number(lat),
          lng: Number(lng)
        }
      });

      // 2. Broadcast coordinates update to all dispatchers in 'operations' room
      io.to('operations').emit('tech_location_changed', {
        techId: userId,
        lat: Number(lat),
        lng: Number(lng)
      });
    } catch (error) {
      console.error(`Failed to update socket location for user ${userId}:`, error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} with WebSockets enabled`);
});

export default app;
