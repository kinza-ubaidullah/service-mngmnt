import { Router } from 'express';
import { getAdminStats, getRecentOperations } from '../controllers/dashboard.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/admin/stats', authenticate, authorizeRole(['ADMIN', 'CALL_CENTER']), getAdminStats);
router.get('/admin/recent-operations', authenticate, authorizeRole(['ADMIN', 'CALL_CENTER']), getRecentOperations);

export default router;
