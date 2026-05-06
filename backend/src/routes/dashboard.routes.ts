import { Router } from 'express';
import { getAdminStats } from '../controllers/dashboard.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/admin/stats', authenticate, authorizeRole(['ADMIN']), getAdminStats);

export default router;
