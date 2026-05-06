import { Router } from 'express';
import { createExpense, getMyExpenses, getWalletSummary } from '../controllers/expense.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', authorizeRole(['TECHNICIAN', 'ADMIN']), createExpense);
router.get('/my-expenses', authorizeRole(['TECHNICIAN', 'ADMIN']), getMyExpenses);
router.get('/wallet-summary', authorizeRole(['TECHNICIAN', 'ADMIN']), getWalletSummary);

export default router;
