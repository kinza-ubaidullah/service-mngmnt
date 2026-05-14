import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());
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
import teamRoutes from './routes/team.routes';

// Support both prefixed and non-prefixed routes for maximum compatibility
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/leads', '/leads'], leadRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/expenses', '/expenses'], expenseRoutes);
app.use(['/api/finance', '/finance'], financialRoutes);
app.use(['/api/workshop', '/workshop'], workshopRoutes);
app.use(['/api/teams', '/teams'], teamRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is healthy' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
