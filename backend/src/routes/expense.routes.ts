import { Router } from 'express';
import { createExpense, getMyExpenses, getWalletSummary } from '../controllers/expense.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', authorizeRole(['TECHNICIAN', 'ADMIN', 'CALL_CENTER']), createExpense);
router.get('/my-expenses', authorizeRole(['TECHNICIAN', 'ADMIN', 'CALL_CENTER']), getMyExpenses);
router.get('/wallet-summary', authorizeRole(['TECHNICIAN', 'ADMIN', 'CALL_CENTER']), getWalletSummary);

export default router;
