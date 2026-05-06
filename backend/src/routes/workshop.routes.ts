import { Router } from 'express';
import { getWorkshopJobs, updateWorkshopStatus } from '../controllers/workshop.controller.js';
import { authenticate, authorizeRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRole(['ADMIN', 'WORKSHOP_MANAGER']));

router.get('/', getWorkshopJobs);
router.patch('/:id/status', updateWorkshopStatus);

export default router;
