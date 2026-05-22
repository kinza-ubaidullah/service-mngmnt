import { Router } from 'express';
import { 
  getTechnicianEarnings, 
  getMyEarningsSummary, 
  getFinancialChartData, 
  getReinvestments, 
  addReinvestment,
  getRecurringSchedules,
  payRecurringSchedule,
  deleteExpenseRecord
} from '../controllers/financial.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/technician-report', authorizeRole(['ADMIN', 'CALL_CENTER']), getTechnicianEarnings);
router.get('/my-summary', authorizeRole(['TECHNICIAN', 'ADMIN', 'CALL_CENTER']), getMyEarningsSummary);
router.get('/chart-data', authorizeRole(['ADMIN', 'CALL_CENTER']), getFinancialChartData);

router.get('/reinvestments', authorizeRole(['ADMIN', 'CALL_CENTER']), getReinvestments);
router.post('/reinvestments', authorizeRole(['ADMIN', 'CALL_CENTER']), addReinvestment);
router.delete('/reinvestments/:id', authorizeRole(['ADMIN']), deleteExpenseRecord);

router.get('/recurring', authorizeRole(['ADMIN']), getRecurringSchedules);
router.post('/recurring/:id/pay', authorizeRole(['ADMIN']), payRecurringSchedule);

export default router;
