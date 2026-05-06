import { Router } from 'express';
import { getTechnicianEarnings, getMyEarningsSummary, getFinancialChartData, getReinvestments, addReinvestment } from '../controllers/financial.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/technician-report', authorizeRole(['ADMIN']), getTechnicianEarnings);
router.get('/my-summary', authorizeRole(['TECHNICIAN', 'ADMIN']), getMyEarningsSummary);
router.get('/chart-data', authorizeRole(['ADMIN']), getFinancialChartData);

router.get('/reinvestments', authorizeRole(['ADMIN']), getReinvestments);
router.post('/reinvestments', authorizeRole(['ADMIN']), addReinvestment);

export default router;
